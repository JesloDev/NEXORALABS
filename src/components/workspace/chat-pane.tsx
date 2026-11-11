'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Hash, Lock, Users, MoreVertical, ShieldCheck, LogOut, Trash2, Pencil, Archive, X, Menu } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { DashboardUser } from '@/components/dashboard/dashboard-app'
import type { ChatMessage } from '@/hooks/use-chat-socket'
import { Composer } from './composer'
import { MessageItem } from './message-item'
import { ChatMembersDialog } from './chat-members-dialog'
import { api, initials } from './types'

function dateLabel(iso: string) {
  const d = new Date(iso), t = new Date(), y = new Date(); y.setDate(t.getDate() - 1)
  if (d.toDateString() === t.toDateString()) return 'Today'
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export interface ChatActions {
  send: (content: string, parentId?: string | null) => Promise<boolean>
  edit: (id: string, content: string) => Promise<boolean>
  remove: (id: string) => void
  react: (id: string, emoji: string) => void
}

export function ChatPane({
  chat, currentUser, messages, typing, connected, online, actions, onTyping, onOpenThread, onChanged, onGone, onOpenSidebar,
}: {
  chat: any
  currentUser: DashboardUser
  messages: ChatMessage[]
  typing: { name: string; userId: string } | null
  connected: boolean
  online: Set<string>
  actions: ChatActions
  onTyping: (t: boolean) => void
  onOpenThread: (m: ChatMessage) => void
  onChanged: () => void // refetch chat detail + lists
  onGone: () => void // chat deleted / left
  onOpenSidebar: () => void
}) {
  const isChannel = chat.type === 'CHANNEL'
  const isGroup = chat.type === 'GROUP'
  const other = chat.type === 'DIRECT' ? chat.members.find((m: any) => m.id !== currentUser.id) : null
  const title = isChannel ? chat.name : isGroup ? chat.name : other?.name || 'Direct message'
  const canSend: boolean = chat.canSend
  const readOnly = !canSend
  const [membersOpen, setMembersOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const stick = useRef(true)

  const names = useMemo(() => chat.members.map((m: any) => m.name as string), [chat.members])
  const pool = useMemo(() => chat.members.filter((m: any) => m.id !== currentUser.id).map((m: any) => ({ id: m.id, name: m.name })), [chat.members, currentUser.id])

  useEffect(() => { stick.current = true }, [chat.id])
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (stick.current || last?.senderId === currentUser.id) bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages.length, chat.id, currentUser.id])

  const join = async () => {
    const r = await api(`/api/chats/${chat.id}/join`, { method: 'POST' })
    if (!r.ok) return toast.error(r.error)
    toast.success(`Joined #${chat.name}`)
    onChanged()
  }
  const leave = async () => {
    if (!confirm(`Leave ${isChannel ? '#' + chat.name : 'this group'}?`)) return
    const r = await api(`/api/chats/${chat.id}/members/${currentUser.id}`, { method: 'DELETE' })
    if (!r.ok) return toast.error(r.error)
    onGone()
  }
  const del = async () => {
    if (!confirm(`Delete ${isChannel ? '#' + chat.name : 'this conversation'} and all its messages? This cannot be undone.`)) return
    const r = await api(`/api/chats/${chat.id}`, { method: 'DELETE' })
    if (!r.ok) return toast.error(r.error)
    toast.success('Deleted.')
    onGone()
  }
  const editTopic = async () => {
    const topic = prompt('Channel topic', chat.topic || '')
    if (topic === null) return
    const r = await api(`/api/chats/${chat.id}`, { method: 'PATCH', json: { topic } })
    r.ok ? onChanged() : toast.error(r.error)
  }
  const archive = async () => {
    if (!confirm(`Archive #${chat.name}? It becomes read-only and disappears from the sidebar.`)) return
    const r = await api(`/api/chats/${chat.id}`, { method: 'PATCH', json: { archived: true } })
    if (!r.ok) return toast.error(r.error)
    onGone()
  }

  // group: date dividers + collapse consecutive messages by the same sender within 5 minutes
  const rows: React.ReactNode[] = []
  let prev: ChatMessage | null = null
  messages.forEach((m) => {
    const label = dateLabel(m.createdAt)
    const newDay = !prev || dateLabel(prev.createdAt) !== label
    if (newDay) rows.push(
      <div key={`d-${m.id}`} className="flex items-center gap-3 px-6 my-4" role="separator" aria-label={label}>
        <div className="h-px flex-1 bg-border" /><span className="text-[11px] font-semibold text-muted-foreground">{label}</span><div className="h-px flex-1 bg-border" />
      </div>)
    const compact = !newDay && !!prev && prev.senderId === m.senderId && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000
    rows.push(
      <MessageItem key={m.id} m={m} compact={compact} mine={m.senderId === currentUser.id} currentUserId={currentUser.id}
        canModerate={!!chat.canModerate} readOnly={readOnly} names={names}
        onReact={actions.react} onReply={onOpenThread} onEdit={actions.edit} onDelete={actions.remove} />)
    prev = m
  })

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      <header className="shrink-0 h-14 border-b border-border flex items-center gap-3 px-3 sm:px-5">
        <Button variant="ghost" size="icon" className="md:hidden -ml-1" onClick={onOpenSidebar} aria-label="Open menu"><Menu className="size-5" /></Button>
        {isChannel ? (
          <div className="min-w-0">
            <h2 className="font-bold flex items-center gap-1 truncate">
              {chat.isPrivate ? <Lock className="size-4 shrink-0" /> : <Hash className="size-4 shrink-0" />}{title}
            </h2>
            {chat.topic && <p className="text-xs text-muted-foreground truncate max-w-[40ch]">{chat.topic}</p>}
          </div>
        ) : (
          <>
            <div className="relative">
              <Avatar className="size-8"><AvatarImage src={(isGroup ? chat.avatar : other?.image) || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{isGroup ? (title?.[0] || 'G') : initials(other?.name)}</AvatarFallback></Avatar>
              {other && online.has(other.id) && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-green-500 ring-2 ring-background" aria-label="Online" />}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold truncate">{title}</h2>
              <p className="text-xs text-muted-foreground truncate">{isGroup ? chat.members.map((m: any) => m.name).join(', ') : other?.title || other?.email}</p>
            </div>
          </>
        )}
        {chat.viaAdmin && <Badge variant="outline" className="ml-1 gap-1 text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400"><ShieldCheck className="size-3" />Admin view</Badge>}
        <div className="flex-1" />
        {(isChannel || isGroup) && (
          <Button variant="outline" size="sm" onClick={() => setMembersOpen(true)} className="gap-1.5 h-8" aria-label="Members">
            <Users className="size-3.5" />{chat.members.length}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="More options"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {(isChannel || isGroup) && <DropdownMenuItem onClick={() => setMembersOpen(true)}><Users className="size-4 mr-2" />Members</DropdownMenuItem>}
            {isChannel && chat.canModerate && <DropdownMenuItem onClick={editTopic}><Pencil className="size-4 mr-2" />Edit topic</DropdownMenuItem>}
            {isChannel && chat.canModerate && <DropdownMenuItem onClick={archive}><Archive className="size-4 mr-2" />Archive channel</DropdownMenuItem>}
            {(isChannel || isGroup) && chat.isMember && <DropdownMenuItem onClick={leave}><LogOut className="size-4 mr-2" />Leave</DropdownMenuItem>}
            {(chat.canModerate || chat.createdBy === currentUser.id) && (
              <><DropdownMenuSeparator /><DropdownMenuItem onClick={del} className="text-destructive focus:text-destructive"><Trash2 className="size-4 mr-2" />{isChannel ? 'Delete channel' : isGroup ? 'Disband group' : 'Delete chat'}</DropdownMenuItem></>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div ref={listRef} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}
        className="flex-1 min-h-0 overflow-y-auto nexora-scroll py-4" role="log" aria-live="polite" aria-label={`Messages in ${title}`}>
        {messages.length === 0 ? (
          <div className="px-6 py-16 text-center text-muted-foreground">
            {isChannel ? <Hash className="size-8 mx-auto mb-2 opacity-40" /> : <Users className="size-8 mx-auto mb-2 opacity-40" />}
            <p className="font-medium text-foreground">{isChannel ? `This is the start of #${chat.name}` : 'No messages yet'}</p>
            <p className="text-sm mt-1">{canSend ? 'Say hello 👋' : chat.canJoin ? 'Join to start the conversation.' : 'Nothing here yet.'}</p>
          </div>
        ) : rows}
        <div ref={bottomRef} />
      </div>

      <footer className="shrink-0 px-3 sm:px-5 pb-3 pt-1">
        <div className="h-5 text-xs text-muted-foreground px-1" aria-live="polite">{typing ? `${typing.name} is typing…` : ''}</div>
        {canSend ? (
          <Composer key={chat.id} placeholder={connected ? `Message ${isChannel ? '#' + title : title}` : 'Connecting…'} disabled={!connected}
            pool={pool} onTyping={onTyping} onSend={(c) => actions.send(c, null)} />
        ) : chat.canJoin ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 flex items-center gap-3">
            <div className="flex-1 text-sm">
              {chat.viaAdmin ? <><ShieldCheck className="size-4 inline mr-1.5 text-primary" />You're viewing this channel as an admin. Join to post.</> : <>You're not in this channel yet.</>}
            </div>
            <Button size="sm" onClick={join}>Join channel</Button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground text-center">
            <ShieldCheck className="size-4 inline mr-1.5 text-primary" />
            {chat.archived ? 'This channel is archived.' : "You're monitoring this conversation (read-only)."}
          </div>
        )}
      </footer>

      {(isChannel || isGroup) && (
        <ChatMembersDialog open={membersOpen} onOpenChange={setMembersOpen} chat={chat} currentUser={currentUser} online={online} onChanged={onChanged} />
      )}
    </div>
  )
}
