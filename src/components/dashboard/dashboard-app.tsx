'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import { AlertTriangle, ArrowLeft, Loader2, Menu, MessageSquarePlus, ShieldCheck, UserCircle, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useChatSocket, type ChatMessage } from '@/hooks/use-chat-socket'
import { AdminConsole } from '@/components/dashboard/admin-console'
import { NotificationsPanel } from '@/components/dashboard/notifications-panel'
import { ProfileView } from '@/components/dashboard/profile-view'
import { NewChatDialog } from '@/components/chat/new-chat-dialog'
import { SpaceRail } from '@/components/workspace/space-rail'
import { SpaceSidebar } from '@/components/workspace/space-sidebar'
import { SpaceHome } from '@/components/workspace/space-home'
import { AllSpaces } from '@/components/workspace/all-spaces'
import { ChatPane, type ChatActions } from '@/components/workspace/chat-pane'
import { ThreadPanel } from '@/components/workspace/thread-panel'
import { PagePane } from '@/components/workspace/page-pane'
import { CreateSpaceDialog } from '@/components/workspace/create-space-dialog'
import { CreateChannelDialog } from '@/components/workspace/create-channel-dialog'
import { SearchDialog, type SearchHit } from '@/components/workspace/search-dialog'
import { api, initials, type Main, type SpaceDetail, type SpaceSummary } from '@/components/workspace/types'

export interface ChatSummary {
  id: string
  type: 'DIRECT' | 'GROUP'
  name?: string | null
  description?: string | null
  avatar?: string | null
  createdAt: string
  updatedAt: string
  isMember: boolean
  canSend: boolean
  members: any[]
  lastMessage: { id: string; content: string; createdAt: string; sender: { id: string; name: string } } | null
  unread: number
}

export interface DashboardUser {
  id: string
  email: string
  name: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE'
  status: string
  image?: string | null
  title?: string | null
  department?: string | null
  phone?: string | null
  bio?: string | null
}

type Ctx = 'home' | string // 'home' = DMs & groups, otherwise a space id

export function DashboardApp({ user }: { user: DashboardUser }) {
  const search = useSearchParams()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === 'dark'
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'

  const [token, setToken] = useState<string | null>(null)
  const sock = useChatSocket(token)

  const [spaces, setSpaces] = useState<SpaceSummary[]>([])
  const [dms, setDms] = useState<ChatSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [ctx, setCtx] = useState<Ctx>(search.get('space') || 'home')
  const [main, setMain] = useState<Main>(search.get('chat') ? { kind: 'chat', id: search.get('chat')! } : { kind: 'empty' })
  const [detail, setDetail] = useState<SpaceDetail | null>(null)
  const [chat, setChat] = useState<any>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [thread, setThread] = useState<ChatMessage | null>(null)
  const [unreadNotifs, setUnreadNotifs] = useState(0)

  const [navOpen, setNavOpen] = useState(false)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [newSpaceOpen, setNewSpaceOpen] = useState(false)
  const [newChannelOpen, setNewChannelOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // ───────── data loading ─────────
  const loadSpaces = useCallback(async () => {
    const r = await api('/api/spaces')
    if (r.ok) setSpaces(r.data.spaces)
  }, [])
  const loadDms = useCallback(async () => {
    const r = await api('/api/chats')
    if (r.ok) setDms(r.data.chats)
  }, [])
  const loadNotifs = useCallback(async () => {
    const r = await api('/api/notifications')
    if (r.ok) setUnreadNotifs(r.data.unread ?? 0)
  }, [])
  const loadDetail = useCallback(async (id: string) => {
    const r = await api(`/api/spaces/${id}`)
    if (r.ok) setDetail(r.data)
    else { setDetail(null); toast.error(r.error) }
    return r.ok ? (r.data as SpaceDetail) : null
  }, [])

  useEffect(() => {
    ;(async () => {
      const t = await api('/api/chat/token')
      if (t.ok) setToken(t.data.token)
      await Promise.all([loadSpaces(), loadDms(), loadNotifs()])
      setLoading(false)
    })()
  }, [loadSpaces, loadDms, loadNotifs])

  // refresh lists on socket nudges (new message elsewhere, membership change, notification)
  const detailRef = useRef<string | null>(null)
  useEffect(() => { detailRef.current = ctx !== 'home' ? ctx : null }, [ctx])
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        loadSpaces(); loadDms(); loadNotifs()
        if (detailRef.current) loadDetail(detailRef.current)
      }, 400)
    }
    window.addEventListener('nexora:chat-list-update', refresh)
    window.addEventListener('nexora:notification', refresh)
    return () => { clearTimeout(timer); window.removeEventListener('nexora:chat-list-update', refresh); window.removeEventListener('nexora:notification', refresh) }
  }, [loadSpaces, loadDms, loadNotifs, loadDetail])

  // space context → load its detail
  useEffect(() => { if (ctx === 'home') setDetail(null); else loadDetail(ctx) }, [ctx, loadDetail])

  // deep link into a channel: ?space=…&chat=… (notification links)
  useEffect(() => { if (main.kind === 'empty' && ctx !== 'home' && detail && !search.get('chat')) setMain({ kind: 'space-home' }) }, [ctx, detail, main.kind, search])

  // active chat → detail + messages + room
  const activeChatId = main.kind === 'chat' ? main.id : null
  useEffect(() => {
    sock.setActiveChat(activeChatId)
    setThread(null)
    setChat(null)
    setChatError(null)
    if (!activeChatId) return
    let cancelled = false
    ;(async () => {
      const [c, m] = await Promise.all([api(`/api/chats/${activeChatId}`), api(`/api/chats/${activeChatId}/messages`)])
      if (cancelled) return
      if (!c.ok) return setChatError(c.error || 'Conversation not found.')
      setChat(c.data.chat)
      sock.joinChat(activeChatId)
      if (m.ok) sock.setChatMessages(activeChatId, m.data.messages)
      // a deep link may point at a chat in a space we have not selected yet
      if (c.data.chat.spaceId && ctx !== c.data.chat.spaceId) setCtx(c.data.chat.spaceId)
      loadSpaces(); loadDms()
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId])

  // thread replies
  useEffect(() => {
    if (!thread || !activeChatId) return
    ;(async () => {
      const r = await api(`/api/chats/${activeChatId}/messages?parent=${thread.id}`)
      if (r.ok) sock.addMessages(r.data.messages)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.id])

  const refetchChat = useCallback(async () => {
    if (!activeChatId) return
    const c = await api(`/api/chats/${activeChatId}`)
    if (c.ok) setChat(c.data.chat)
    loadSpaces(); loadDms()
    if (ctx !== 'home') loadDetail(ctx)
  }, [activeChatId, ctx, loadSpaces, loadDms, loadDetail])

  // ───────── derived ─────────
  const chatMessages = useMemo(
    () => sock.messages.filter((m) => m.chatId === activeChatId && !m.parentId).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [sock.messages, activeChatId],
  )
  const liveThread = thread ? sock.messages.find((m) => m.id === thread.id) ?? thread : null
  const replies = useMemo(
    () => (thread ? sock.messages.filter((m) => m.parentId === thread.id).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)) : []),
    [sock.messages, thread],
  )
  const homeUnread = dms.reduce((n, d) => n + d.unread, 0)

  const actions: ChatActions = useMemo(() => ({
    send: async (content, parentId) => {
      if (!activeChatId) return false
      const r = await sock.send(activeChatId, content, parentId)
      if (!r.ok) toast.error(r.error || 'Could not send.')
      return r.ok
    },
    edit: async (id, content) => {
      const r = await sock.edit(id, content)
      if (!r.ok) toast.error(r.error || 'Could not edit.')
      return r.ok
    },
    remove: (id) => { sock.remove(id).then((r) => { if (!r.ok) toast.error(r.error || 'Could not delete.') }) },
    react: (id, emoji) => { sock.react(id, emoji).then((r) => { if (!r.ok) toast.error(r.error || 'Could not react.') }) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [activeChatId, sock.send, sock.edit, sock.remove, sock.react])

  // ───────── navigation ─────────
  const go = (c: Ctx, m: Main) => { setCtx(c); setMain(m); setNavOpen(false) }
  const goHome = () => go('home', { kind: 'empty' })
  const goSpace = async (id: string) => {
    setCtx(id); setNavOpen(false)
    const d = await loadDetail(id)
    const first = d?.channels.find((c) => c.isMember) ?? d?.channels[0]
    setMain(first ? { kind: 'chat', id: first.id } : { kind: 'space-home' })
  }
  const select = (m: Main) => { setMain(m); setNavOpen(false) }

  // ───────── browser / Android back button ─────────
  // Every view change pushes a history entry so the system back gesture steps through the app
  // (and closes the drawer / thread) instead of leaving the dashboard.
  const navKey = `${ctx}|${JSON.stringify(main)}`
  const navKeyRef = useRef(navKey)
  const histReady = useRef(false)
  const popping = useRef(false)
  useEffect(() => {
    const prev = navKeyRef.current
    navKeyRef.current = navKey
    if (!histReady.current) { histReady.current = true; try { history.replaceState({ ...(history.state || {}), nx: { ctx, main } }, '') } catch {} ; return }
    if (popping.current) { popping.current = false; return }
    if (prev === navKey) return
    try {
      // the automatic empty → space-home step after loading a space should not add a back stop
      if (prev.endsWith('{"kind":"empty"}')) history.replaceState({ nx: { ctx, main } }, '')
      else history.pushState({ nx: { ctx, main } }, '')
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navKey])
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      setNavOpen(false); setThread(null)
      const st = e.state?.nx as { ctx: Ctx; main: Main } | undefined
      if (!st) return
      const key = `${st.ctx}|${JSON.stringify(st.main)}`
      if (key === navKeyRef.current) return
      popping.current = true
      setCtx(st.ctx); setMain(st.main)
      if (st.ctx !== 'home') loadDetail(st.ctx)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [loadDetail])

  const onPick = (h: SearchHit) => {
    if (h.kind === 'page' && h.spaceId) go(h.spaceId, { kind: 'page', id: h.id })
    else if (h.chatId) go(h.spaceId ?? 'home', { kind: 'chat', id: h.chatId })
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const createPage = async (parentId: string | null) => {
    if (ctx === 'home') return
    const r = await api(`/api/spaces/${ctx}/pages`, { method: 'POST', json: { parentId } })
    if (!r.ok) return toast.error(r.error)
    await loadDetail(ctx)
    setMain({ kind: 'page', id: r.data.page.id })
  }
  const joinSpace = async () => {
    if (ctx === 'home') return
    const r = await api(`/api/spaces/${ctx}/join`, { method: 'POST' })
    if (!r.ok) return toast.error(r.error)
    toast.success('Joined space.')
    loadDetail(ctx); loadSpaces()
  }

  // ───────── chrome ─────────
  const rail = (
    <SpaceRail
      spaces={spaces} ctx={ctx} isAdmin={isAdmin} dark={dark} homeUnread={homeUnread}
      notificationsActive={main.kind === 'notifications'} consoleActive={main.kind === 'console'} allSpacesActive={main.kind === 'all-spaces'} profileActive={main.kind === 'profile'}
      onProfile={() => go(ctx, { kind: 'profile' })}
      onHome={goHome} onSpace={goSpace} onAllSpaces={() => go(ctx, { kind: 'all-spaces' })} onCreateSpace={() => setNewSpaceOpen(true)}
      onSearch={() => { setNavOpen(false); setSearchOpen(true) }}
      onNotifications={() => { go(ctx, { kind: 'notifications' }); loadNotifs() }}
      onConsole={() => go(ctx, { kind: 'console' })}
      onTheme={() => setTheme(dark ? 'light' : 'dark')}
      onSignOut={() => signOut({ callbackUrl: '/' })}
    />
  )

  const sidebar = ctx === 'home' ? (
    <HomeSidebar user={user} dms={dms} online={sock.online} activeId={activeChatId} unreadNotifs={unreadNotifs} onProfile={() => select({ kind: 'profile' })}
      onSelect={(id) => select({ kind: 'chat', id })} onNew={() => setNewChatOpen(true)} />
  ) : detail ? (
    <SpaceSidebar detail={detail} main={main} canCreate={detail.access.canViewContent && !detail.space.archived}
      onSelect={select} onCreateChannel={() => setNewChannelOpen(true)} onCreatePage={createPage} onJoinSpace={joinSpace} />
  ) : (
    <div className="h-full bg-sidebar flex items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
  )

  const openSidebar = () => setNavOpen(true)
  const threadOpen = !!liveThread && main.kind === 'chat'

  let content: React.ReactNode = null
  if (main.kind === 'chat') {
    content = chatError ? (
      <Empty title="Conversation not available" body={chatError} onOpenSidebar={openSidebar} />
    ) : !chat ? (
      <div className="h-full flex items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
    ) : (
      <ChatPane chat={chat} currentUser={user} messages={chatMessages} typing={sock.typing[chat.id] ?? null} connected={sock.connected} online={sock.online}
        actions={actions} onTyping={(t) => sock.sendTyping(chat.id, t)} onOpenThread={setThread} onChanged={refetchChat}
        onGone={() => { loadSpaces(); loadDms(); if (ctx !== 'home') { loadDetail(ctx); setMain({ kind: 'space-home' }) } else setMain({ kind: 'empty' }) }}
        onOpenSidebar={openSidebar} />
    )
  } else if (main.kind === 'page' && detail) {
    content = <PagePane key={main.id} pageId={main.id} spaceName={detail.space.name} onSaved={() => loadDetail(ctx)} onAddChild={(p) => createPage(p)}
      onDeleted={() => { loadDetail(ctx); setMain({ kind: 'space-home' }) }} onOpenSidebar={openSidebar} />
  } else if (main.kind === 'space-home' && detail) {
    content = <SpaceHome detail={detail} user={user} online={sock.online} onSelect={select} onChanged={() => { loadDetail(ctx); loadSpaces() }}
      onLeftOrDeleted={() => { loadSpaces(); goHome() }} onJoinSpace={joinSpace} onOpenSidebar={openSidebar} />
  } else if (main.kind === 'all-spaces') {
    content = <AllSpaces spaces={spaces} isAdmin={isAdmin} onOpen={goSpace} onCreate={() => setNewSpaceOpen(true)} onOpenSidebar={openSidebar} />
  } else if (main.kind === 'console') {
    content = <SimplePane title="Admin console" onMenu={openSidebar}><AdminConsole user={user} /></SimplePane>
  } else if (main.kind === 'notifications') {
    content = <SimplePane title="Notifications" onMenu={openSidebar}><NotificationsPanel /></SimplePane>
  } else if (main.kind === 'profile') {
    content = <SimplePane title="Profile" onMenu={openSidebar}><ProfileView user={user as any} /></SimplePane>
  } else {
    content = ctx === 'home'
      ? <Empty title={`Welcome, ${user.name.split(' ')[0]}`} body="Pick a conversation, start a new one, or open a space from the left rail." action={<Button onClick={() => setNewChatOpen(true)}><MessageSquarePlus className="size-4 mr-2" />New message</Button>} onOpenSidebar={openSidebar} />
      : <Empty title="Pick something from the sidebar" body="Open a channel or a page." onOpenSidebar={openSidebar} />
  }

  if (loading) return <div className="h-dvh flex items-center justify-center bg-background"><Loader2 className="size-6 animate-spin text-primary" /></div>

  return (
    <div className="h-dvh flex bg-background text-foreground overflow-hidden">
      {/* desktop: rail + sidebar */}
      <div className="hidden md:flex shrink-0">
        {rail}
        <aside className="w-64 border-r border-sidebar-border">{sidebar}</aside>
      </div>
      {/* mobile: same two columns in a drawer */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="p-0 w-[min(92vw,22rem)] flex flex-row gap-0 [&>button]:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {rail}
          <div className="flex-1 min-w-0 border-l border-sidebar-border">{sidebar}</div>
        </SheetContent>
      </Sheet>

      <main className="flex-1 min-w-0 h-full flex flex-col">
        {token && !sock.connected && (
          <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300" role="status">
            {sock.connectionError ? <AlertTriangle className="size-3.5 shrink-0" /> : <Loader2 className="size-3.5 animate-spin shrink-0" />}
            <span>{sock.connectionError ? `Can't reach the chat service${sock.chatUrl ? ` (${sock.chatUrl})` : ''}. Real-time messages may be delayed.` : 'Connecting to the chat service…'}</span>
          </div>
        )}
        <div className="flex-1 min-h-0">{content}</div>
      </main>

      {threadOpen && liveThread && chat && (
        <div className="fixed inset-0 z-40 md:static md:inset-auto md:z-auto md:flex">
          <ThreadPanel parent={liveThread} replies={replies} chat={chat} currentUser={user} connected={sock.connected} actions={actions} onClose={() => setThread(null)} />
        </div>
      )}

      <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} onCreated={async (c: any) => { setNewChatOpen(false); await loadDms(); (c.members || []).forEach((m: any) => m.userId !== user.id && sock.notifyUserRefresh(m.userId)); go('home', { kind: 'chat', id: c.id }) }} />
      <CreateSpaceDialog open={newSpaceOpen} onOpenChange={setNewSpaceOpen} onCreated={async (id) => { setNewSpaceOpen(false); await loadSpaces(); goSpace(id) }} />
      {ctx !== 'home' && (
        <CreateChannelDialog spaceId={ctx} open={newChannelOpen} onOpenChange={setNewChannelOpen}
          onCreated={async (id) => { setNewChannelOpen(false); await loadDetail(ctx); setMain({ kind: 'chat', id }) }} />
      )}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} onPick={onPick} />
    </div>
  )
}

// Wrapper for full-page views (console, notifications, profile): gives mobile a back button + menu button.
function SimplePane({ title, onMenu, children }: { title: string; onMenu: () => void; children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col">
      <header className="md:hidden h-14 shrink-0 border-b border-border flex items-center gap-1 px-2">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} aria-label="Go back"><ArrowLeft className="size-5" /></Button>
        <h1 className="font-semibold text-sm flex-1 truncate">{title}</h1>
        <Button variant="ghost" size="icon" onClick={onMenu} aria-label="Open menu"><Menu className="size-5" /></Button>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto nexora-scroll">{children}</div>
    </div>
  )
}

function Empty({ title, body, action, onOpenSidebar }: { title: string; body: string; action?: React.ReactNode; onOpenSidebar: () => void }) {
  return (
    <div className="h-full flex flex-col">
      <header className="md:hidden h-14 border-b border-border flex items-center px-3">
        <Button variant="ghost" size="icon" onClick={onOpenSidebar} aria-label="Open menu"><Menu className="size-5" /></Button>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-8">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground max-w-sm">{body}</p>
        {action}
      </div>
    </div>
  )
}

function HomeSidebar({ user, dms, online, activeId, unreadNotifs, onProfile, onSelect, onNew }: {
  user: DashboardUser; dms: ChatSummary[]; online: Set<string>; activeId: string | null; unreadNotifs: number; onProfile: () => void
  onSelect: (id: string) => void; onNew: () => void
}) {
  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="h-14 shrink-0 px-3 border-b border-sidebar-border flex items-center">
        <h2 className="font-bold flex-1">Messages</h2>
        <Button size="icon" variant="ghost" onClick={onNew} aria-label="New message"><MessageSquarePlus className="size-4" /></Button>
      </div>
      <div className="flex-1 overflow-y-auto nexora-scroll p-2 space-y-0.5">
        {dms.length === 0 && <p className="px-3 py-6 text-xs text-muted-foreground text-center">No conversations yet. Start one with the button above.</p>}
        {dms.map((d) => {
          const other = d.type === 'DIRECT' ? d.members.find((m) => m.id !== user.id) : null
          const title = d.type === 'GROUP' ? d.name || 'Group' : other?.name || 'Direct message'
          const active = d.id === activeId
          return (
            <button key={d.id} onClick={() => onSelect(d.id)} aria-current={active ? 'page' : undefined}
              className={cn('w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors', active ? 'bg-primary/10' : 'hover:bg-sidebar-accent')}>
              <div className="relative shrink-0">
                <Avatar className="size-8">
                  <AvatarImage src={(d.type === 'GROUP' ? d.avatar : other?.image) || undefined} />
                  <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">{d.type === 'GROUP' ? <Users className="size-4" /> : initials(other?.name)}</AvatarFallback>
                </Avatar>
                {other && online.has(other.id) && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-lime-500 ring-2 ring-sidebar" aria-label="Online" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn('text-sm truncate flex items-center gap-1', d.unread > 0 ? 'font-bold' : 'font-medium')}>
                  {title}
                  {!d.isMember && <ShieldCheck className="size-3 text-amber-600 shrink-0" aria-label="Monitoring (read-only)" />}
                </div>
                <div className="text-xs text-muted-foreground truncate">{d.lastMessage ? `${d.lastMessage.sender.id === user.id ? 'You: ' : ''}${d.lastMessage.content}` : 'No messages yet'}</div>
              </div>
              {d.unread > 0 && <Badge className="h-5 min-w-5 px-1.5 rounded-full text-[10px]">{d.unread}</Badge>}
            </button>
          )
        })}
      </div>
      <button onClick={onProfile} aria-label="Open your profile" className="shrink-0 border-t border-sidebar-border p-3 flex items-center gap-2.5 text-left hover:bg-sidebar-accent transition-colors">
        <Avatar className="size-8"><AvatarImage src={user.image || undefined} /><AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">{initials(user.name)}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{user.name}</div>
          <div className="text-[11px] text-muted-foreground truncate">{user.role === 'EMPLOYEE' ? user.title || 'Member' : user.role.replace('_', ' ').toLowerCase()}</div>
        </div>
        {unreadNotifs > 0 && <Badge variant="secondary" className="text-[10px]">{unreadNotifs}</Badge>}
        <UserCircle className="size-4 text-muted-foreground" />
      </button>
    </div>
  )
}
