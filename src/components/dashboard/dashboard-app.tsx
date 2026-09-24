'use client'

import { useEffect, useState, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { io } from 'socket.io-client'
import { Logo } from '@/components/site/logo'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Menu, PanelLeft, X, LogOut, MessageSquare, ShieldCheck, Bell, Plus, Search, Moon, Sun, Settings, Loader2, UserCircle, AlertTriangle,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useChatSocket } from '@/hooks/use-chat-socket'
import { ChatView } from '@/components/chat/chat-view'
import { AdminConsole } from '@/components/dashboard/admin-console'
import { ProfileView } from '@/components/dashboard/profile-view'
import { NewChatDialog } from '@/components/chat/new-chat-dialog'
import { NotificationsPanel } from '@/components/dashboard/notifications-panel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export function DashboardApp({ user }: { user: DashboardUser }) {
  const router = useRouter()
  const search = useSearchParams()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [token, setToken] = useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = useState(true)
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [chatsLoading, setChatsLoading] = useState(true)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(search.get('chat'))
  const [selectedChatDetail, setSelectedChatDetail] = useState<any>(null)
  const [view, setView] = useState<'chat' | 'console' | 'notifications' | 'profile'>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false) // mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false) // desktop collapse
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const socket = useChatSocket(token)

  // fetch socket token
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/chat/token')
        const data = await res.json()
        if (res.ok) setToken(data.token)
      } catch {}
      finally { setTokenLoading(false) }
    })()
  }, [])

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chats')
      const data = await res.json()
      if (res.ok) setChats(data.chats)
    } catch {}
    finally { setChatsLoading(false) }
  }, [])

  useEffect(() => { fetchChats() }, [fetchChats])

  // refetch when socket signals a list update
  useEffect(() => {
    const handler = () => fetchChats()
    window.addEventListener('nexora:chat-list-update', handler)
    return () => window.removeEventListener('nexora:chat-list-update', handler)
  }, [fetchChats])

  // select chat from URL on load
  useEffect(() => {
    if (chats.length && selectedChatId && !selectedChatDetail) {
      selectChat(selectedChatId)
    }
  }, [chats, selectedChatId])

  const selectChat = useCallback(async (chatId: string) => {
    setSelectedChatId(chatId)
    setView('chat')
    setSidebarOpen(false)
    socket.setActiveChatId(chatId)
    socket.joinChat(chatId)
    socket.setMessages([])
    try {
      const res = await fetch(`/api/chats/${chatId}`)
      const data = await res.json()
      if (res.ok) setSelectedChatDetail(data.chat)
      const msgRes = await fetch(`/api/chats/${chatId}/messages?limit=60`)
      const msgData = await msgRes.json()
      if (msgRes.ok) socket.setMessages(msgData.messages)
      socket.markRead(chatId)
      // clear unread locally
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)))
    } catch {}
  }, [socket])

  // keep unread counts fresh when socket receives messages for non-active chats
  useEffect(() => {
    if (!socket.messages.length) return
    // refetch chat list to update last message + unread
    fetchChats()
  }, [socket.messages.length])

  const handleSend = async (content: string) => {
    if (!selectedChatId) return
    const res = await socket.sendMessage(selectedChatId, content)
    if (!res.ok) {
      toast.error(res.error || 'Message could not be sent.')
    }
    // optimistic refresh of last message handled via socket 'message:new'
  }

  const handleCreatedChat = (chat: any) => {
    setNewChatOpen(false)
    fetchChats()
    if (chat?.id) {
      router.push(`/dashboard?chat=${chat.id}`)
      setTimeout(() => selectChat(chat.id), 200)
    }
  }

  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'

  const filteredChats = chats.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    if (c.type === 'GROUP' && c.name?.toLowerCase().includes(q)) return true
    if (c.type === 'DIRECT') {
      const other = c.members.find((m) => m.id !== user.id)
      return other?.name?.toLowerCase().includes(q) || other?.email?.toLowerCase().includes(q)
    }
    return false
  })

  const SidebarInner = (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Profile header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarImage src={user.image || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate text-sm">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.title || user.email}</div>
          </div>
          <Badge variant={user.role === 'SUPER_ADMIN' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
            {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'ADMIN' ? 'Admin' : 'Team'}
          </Badge>
        </div>
      </div>

      {/* New chat */}
      <div className="p-3">
        <Button onClick={() => setNewChatOpen(true)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-medium">
          <Plus className="size-4 mr-1.5" /> New chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Chat list */}
      <ScrollArea className="flex-1 nexora-scroll">
        <div className="px-2 pb-2 space-y-0.5">
          {chatsLoading ? (
            <div className="p-6 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading...
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <MessageSquare className="size-7 mx-auto mb-2 opacity-40" />
              No conversations yet.
            </div>
          ) : (
            filteredChats.map((c) => {
              const other = c.type === 'DIRECT' ? c.members.find((m) => m.id !== user.id) : null
              const title = c.type === 'GROUP' ? c.name : other?.name || 'Direct chat'
              const isActive = c.id === selectedChatId && view === 'chat'
              return (
                <button
                  key={c.id}
                  onClick={() => selectChat(c.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3',
                    isActive ? 'bg-primary/10 ring-1 ring-primary/20' : 'hover:bg-sidebar-accent',
                  )}
                >
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage src={(c.type === 'GROUP' ? c.avatar : other?.image) || undefined} />
                    <AvatarFallback className={cn('font-semibold', c.type === 'GROUP' ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground')}>
                      {c.type === 'GROUP' ? (title?.[0] || 'G') : initials(title || '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{title}</span>
                      {c.lastMessage && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground truncate">
                        {c.lastMessage ? (c.lastMessage.sender.id === user.id ? 'You: ' : '') + c.lastMessage.content : c.type === 'GROUP' ? `${c.members.length} members` : 'No messages yet'}
                      </span>
                      {!c.isMember && user.role === 'SUPER_ADMIN' && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-muted-foreground">Monitor</Badge>
                      )}
                      {c.unread > 0 && (
                        <span className="size-4 min-w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{c.unread}</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Bottom nav */}
      <div className="border-t border-sidebar-border p-2 space-y-0.5">
        {isAdmin && (
          <NavButton active={view === 'console'} onClick={() => { setView('console'); setSidebarOpen(false) }} icon={ShieldCheck} label="Admin Console" />
        )}
        <NavButton active={view === 'notifications'} onClick={() => { setView('notifications'); setSidebarOpen(false) }} icon={Bell} label="Notifications" />
        <NavButton active={view === 'profile'} onClick={() => { setView('profile'); setSidebarOpen(false) }} icon={UserCircle} label="Profile" />
        <NavButton onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark') }} icon={mounted && theme === 'dark' ? Sun : Moon} label={mounted && theme === 'dark' ? 'Light mode' : 'Dark mode'} />
        <NavButton onClick={() => signOut({ callbackUrl: '/' })} icon={LogOut} label="Sign out" danger />
      </div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between h-14 px-3 border-b border-border bg-background shrink-0">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
        <Logo size={28} />
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
          {mounted && theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar */}
        <aside className={cn('hidden md:block transition-all duration-300 border-r border-sidebar-border shrink-0', sidebarCollapsed ? 'w-0' : 'w-80')}>
          <div className="w-80 h-full overflow-hidden">{SidebarInner}</div>
        </aside>

        {/* Mobile drawer */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-80 max-w-[85vw]">
            {SidebarInner}
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
          {/* Desktop sidebar toggle (floating) */}
          {!sidebarCollapsed && view === 'chat' && selectedChatDetail && (
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setSidebarCollapsed(true)}
              className="hidden md:flex absolute top-3 left-3 z-20 size-9 rounded-full shadow-sm"
              aria-label="Collapse sidebar"
            >
              <PanelLeft className="size-4" />
            </Button>
          )}
          {sidebarCollapsed && (
            <div className="hidden md:flex flex-col items-center gap-2 absolute top-3 left-3 z-20">
              <Button variant="secondary" size="icon" onClick={() => setSidebarCollapsed(false)} className="size-9 rounded-full shadow-sm" aria-label="Expand sidebar">
                <PanelLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="md:hidden size-9 rounded-full" aria-label="Open menu">
                <Menu className="size-4" />
              </Button>
            </div>
          )}

          {/* Connection-status banner — shows when the chat service can't be reached */}
          {view === 'chat' && !tokenLoading && token && !socket.connected && (
            <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
              {socket.connectionError ? <AlertTriangle className="size-3.5 shrink-0" /> : <Loader2 className="size-3.5 animate-spin shrink-0" />}
              <span>
                {socket.connectionError
                  ? `Can't reach the chat service${socket.chatUrl ? ` (${socket.chatUrl})` : ''}. Real-time messages may be delayed.`
                  : 'Connecting to the chat service...'}
              </span>
            </div>
          )}

          {tokenLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : view === 'console' ? (
            <AdminConsole user={user} />
          ) : view === 'notifications' ? (
            <NotificationsPanel />
          ) : view === 'profile' ? (
            <ProfileView user={user as any} />
          ) : selectedChatDetail ? (
            <ChatView
              chat={selectedChatDetail}
              currentUser={user}
              messages={socket.messages}
              connected={socket.connected}
              onSend={handleSend}
              onDeleteMessage={socket.deleteMessage}
              onTyping={(t) => socket.sendTyping(selectedChatDetail.id, t)}
              typing={socket.typing[selectedChatDetail.id] || null}
              onRefreshChats={fetchChats}
              onChatDeleted={() => { setSelectedChatId(null); setSelectedChatDetail(null); fetchChats(); router.push('/dashboard') }}
              onMembersChanged={() => { selectChat(selectedChatDetail.id) }}
            />
          ) : (
            <EmptyState onNewChat={() => setNewChatOpen(true)} />
          )}
        </main>
      </div>

      <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} onCreated={handleCreatedChat} />
    </div>
  )
}

function NavButton({ active, onClick, icon: Icon, label, danger }: { active?: boolean; onClick: () => void; icon: any; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
        danger && 'hover:bg-destructive/10 hover:text-destructive',
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}

function EmptyState({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <MessageSquare className="size-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold">Your conversations</h2>
      <p className="mt-2 text-muted-foreground max-w-sm">Select a conversation to start chatting, or begin a new direct or group chat with your team.</p>
      <Button onClick={onNewChat} className="mt-5 bg-primary text-primary-foreground rounded-full">
        <Plus className="size-4 mr-1.5" /> Start a new chat
      </Button>
    </div>
  )
}
