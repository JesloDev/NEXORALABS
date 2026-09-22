'use client'

import { useEffect, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Send, Trash2, Users, Info, ShieldCheck, Lock, MoreVertical, UserPlus, Crown, Loader2, ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { DashboardUser } from '@/components/dashboard/dashboard-app'
import type { ChatMessage } from '@/hooks/use-chat-socket'

function initials(name: string) {
  return name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function formatDateLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date(); yest.setDate(yest.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
}

export function ChatView({
  chat, currentUser, messages, connected, onSend, onDeleteMessage, onTyping, typing, onRefreshChats, onChatDeleted, onMembersChanged,
}: {
  chat: any
  currentUser: DashboardUser
  messages: ChatMessage[]
  connected: boolean
  onSend: (content: string) => void
  onDeleteMessage: (id: string) => void
  onTyping: (isTyping: boolean) => void
  typing: { name: string; userId: string } | null
  onRefreshChats: () => void
  onChatDeleted: () => void
  onMembersChanged: () => void
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [addUserQuery, setAddUserQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [adding, setAdding] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isGroup = chat.type === 'GROUP'
  const other = !isGroup ? chat.members.find((m: any) => m.id !== currentUser.id) : null
  const title = isGroup ? chat.name : other?.name || 'Direct chat'
  const canSend = chat.canSend !== false // super admin read-only for non-member chats
  const readOnly = !canSend

  // auto scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    const content = text.trim()
    if (!content || !canSend) return
    setSending(true)
    onTyping(false)
    await onSend(content)
    setText('')
    setSending(false)
  }

  const handleDeleteChat = async () => {
    if (!confirm(`Delete this ${isGroup ? 'group' : 'conversation'}? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/chats/${chat.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Failed to delete.')
      toast.success('Conversation deleted.')
      onChatDeleted()
    } catch {
      toast.error('Network error.')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the group?')) return
    try {
      const res = await fetch(`/api/chats/${chat.id}/members/${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Failed.')
      toast.success('Member removed.')
      onMembersChanged()
      onRefreshChats()
    } catch { toast.error('Network error.') }
  }

  const handleLeaveGroup = async () => {
    if (!confirm('Leave this group?')) return
    try {
      const res = await fetch(`/api/chats/${chat.id}/members/${currentUser.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); return toast.error(d.error || 'Failed.') }
      toast.success('You left the group.')
      onChatDeleted()
    } catch { toast.error('Network error.') }
  }

  const searchUsers = async (q: string) => {
    setAddUserQuery(q)
    if (q.trim().length < 1) { setSearchResults([]); return }
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (res.ok) {
        const memberIds = new Set(chat.members.map((m: any) => m.id))
        setSearchResults(data.users.filter((u: any) => !memberIds.has(u.id)))
      }
    } catch {}
  }

  const handleAddMember = async (userId: string) => {
    setAdding(true)
    try {
      const res = await fetch(`/api/chats/${chat.id}/members`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userId] }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Failed to add member.')
      toast.success('Member added.')
      setSearchResults((prev) => prev.filter((u) => u.id !== userId))
      onMembersChanged()
      onRefreshChats()
    } catch { toast.error('Network error.') }
    finally { setAdding(false) }
  }

  // Group consecutive messages by sender
  const grouped: { date: string; items: ChatMessage[] }[] = []
  let lastDate = ''
  let lastSender = ''
  messages.forEach((m) => {
    const dateLabel = formatDateLabel(m.createdAt)
    if (dateLabel !== lastDate) {
      grouped.push({ date: dateLabel, items: [m] })
      lastDate = dateLabel
      lastSender = m.senderId
    } else {
      const group = grouped[grouped.length - 1]
      if (m.senderId === lastSender) {
        group.items.push(m)
      } else {
        grouped.push({ date: '', items: [m] })
      }
      lastSender = m.senderId
    }
  })

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── FIXED HEADER (does not scroll) ── */}
      <header className="shrink-0 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex items-center gap-3 px-4 sm:px-5">
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={(isGroup ? chat.avatar : other?.image) || undefined} />
          <AvatarFallback className={cn('font-semibold', isGroup ? 'bg-primary/15 text-primary' : 'bg-muted')}>
            {isGroup ? (title?.[0] || 'G') : initials(other?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold truncate">{title}</h2>
            {isGroup && <Badge variant="secondary" className="text-[10px] gap-1"><Users className="size-2.5" /> {chat.members.length}</Badge>}
            {readOnly && <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-500/30"><ShieldCheck className="size-2.5" /> Monitoring</Badge>}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {isGroup
              ? chat.members.map((m: any) => m.name).join(', ')
              : other?.title || other?.email}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setMenuOpen((o) => !o)} aria-label="More options">
              <MoreVertical className="size-4" />
            </Button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-40 w-52 rounded-lg border border-border bg-popover shadow-md py-1">
                  <button onClick={() => { setInfoOpen(true); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                    <Info className="size-4" /> Conversation info
                  </button>
                  {(chat.canModerate || isGroup) && (
                    <button onClick={() => { setInfoOpen(true); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                      <UserPlus className="size-4" /> Add members
                    </button>
                  )}
                  {isGroup && (
                    <button onClick={handleLeaveGroup} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-amber-600">
                      <ChevronLeft className="size-4" /> Leave group
                    </button>
                  )}
                  {(chat.canModerate || chat.members.find((m: any) => m.id === currentUser.id)?.memberRole === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') && (
                    <button onClick={() => { handleDeleteChat(); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive">
                      <Trash2 className="size-4" /> {isGroup ? 'Disband group' : 'Delete chat'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── SCROLLABLE MESSAGES (header stays fixed) ── */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto nexora-scroll bg-muted/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-1">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <Lock className="size-8 mx-auto mb-2 opacity-40" />
              No messages yet. {canSend ? 'Say hello!' : 'You are viewing this conversation in monitoring mode.'}
            </div>
          ) : (
            grouped.map((g, gi) => (
              <div key={gi}>
                {g.date && (
                  <div className="flex justify-center my-4">
                    <span className="text-[11px] font-medium text-muted-foreground bg-background border border-border px-3 py-1 rounded-full">{g.date}</span>
                  </div>
                )}
                <MessageGroup messages={g.items} currentUserId={currentUser.id} onDelete={onDeleteMessage} canDeleteAll={currentUser.role === 'SUPER_ADMIN'} />
              </div>
            ))
          )}
          {typing && (
            <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <span className="flex gap-1">
                <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '240ms' }} />
              </span>
              {typing.name} is typing...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── COMPOSER (fixed at bottom) ── */}
      <footer className="shrink-0 border-t border-border bg-background p-3 sm:p-4">
        {readOnly ? (
          <div className="max-w-3xl mx-auto rounded-xl bg-muted/60 border border-dashed border-border px-4 py-3 text-center text-sm text-muted-foreground">
            <ShieldCheck className="size-4 inline mr-1.5 text-primary" />
            You're monitoring this conversation. Join the group to send messages.
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <Input
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                onTyping(e.target.value.length > 0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={connected ? 'Type a message...' : 'Connecting...'}
              disabled={!connected || sending}
              className="flex-1 rounded-full min-h-11 bg-background"
            />
            <Button onClick={handleSend} disabled={!connected || sending || !text.trim()} className="rounded-full size-11 p-0 bg-primary hover:bg-primary/90 text-primary-foreground" aria-label="Send message">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        )}
      </footer>

      {/* ── CONVERSATION INFO / MEMBER MANAGEMENT ── */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isGroup ? 'Group info' : 'Conversation info'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-14">
                <AvatarImage src={(isGroup ? chat.avatar : other?.image) || undefined} />
                <AvatarFallback className={cn('font-semibold text-lg', isGroup ? 'bg-primary/15 text-primary' : 'bg-muted')}>
                  {isGroup ? (title?.[0] || 'G') : initials(other?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-semibold truncate">{title}</div>
                <div className="text-xs text-muted-foreground">{isGroup ? `${chat.members.length} members` : other?.email}</div>
              </div>
            </div>

            {isGroup && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Members ({chat.members.length})</h4>
                    {(chat.canModerate || currentUser.role === 'SUPER_ADMIN') && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs"><UserPlus className="size-3 mr-1" /> Add</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm">
                          <DialogHeader><DialogTitle>Add members</DialogTitle></DialogHeader>
                          <Input value={addUserQuery} onChange={(e) => searchUsers(e.target.value)} placeholder="Search by name or email..." />
                          <div className="max-h-72 overflow-y-auto nexora-scroll space-y-1 mt-2">
                            {searchResults.map((u) => (
                              <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                                <Avatar className="size-8"><AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback></Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{u.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                                </div>
                                <Button size="sm" variant="ghost" className="h-7" disabled={adding} onClick={() => handleAddMember(u.id)}>
                                  <UserPlus className="size-3.5" />
                                </Button>
                              </div>
                            ))}
                            {searchResults.length === 0 && addUserQuery && <div className="text-center text-sm text-muted-foreground py-4">No users found.</div>}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto nexora-scroll space-y-1">
                    {chat.members.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60">
                        <Avatar className="size-8">
                          <AvatarImage src={m.image || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(m.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate flex items-center gap-1">
                            {m.name}
                            {m.memberRole === 'ADMIN' && <Crown className="size-3 text-amber-500" />}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{m.title || m.email}</div>
                        </div>
                        {(chat.canModerate || currentUser.role === 'SUPER_ADMIN') && m.id !== currentUser.id && (
                          <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive" onClick={() => handleRemoveMember(m.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {(chat.canModerate || currentUser.role === 'SUPER_ADMIN') && (
                  <DialogFooter className="gap-2">
                    <Button variant="destructive" onClick={handleDeleteChat} className="w-full">
                      <Trash2 className="size-4 mr-1.5" /> Disband group
                    </Button>
                  </DialogFooter>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MessageGroup({ messages, currentUserId, onDelete, canDeleteAll }: { messages: ChatMessage[]; currentUserId: string; onDelete: (id: string) => void; canDeleteAll: boolean }) {
  const first = messages[0]
  const isMine = first.senderId === currentUserId
  return (
    <div className={cn('flex gap-2.5', isMine && 'flex-row-reverse')}>
      <Avatar className="size-8 shrink-0 mt-1">
        <AvatarImage src={first.sender.image || undefined} />
        <AvatarFallback className={cn('text-xs', isMine ? 'bg-primary/15 text-primary' : 'bg-muted')}>{initials(first.sender.name)}</AvatarFallback>
      </Avatar>
      <div className={cn('flex flex-col max-w-[78%]', isMine && 'items-end')}>
        {!isMine && <span className="text-xs font-medium text-foreground/70 px-1 mb-0.5">{first.sender.name}</span>}
        <div className={cn('flex flex-col gap-0.5', isMine && 'items-end')}>
          {messages.map((m, idx) => (
            <div
              key={m.id}
              className={cn(
                'group relative px-3.5 py-2 rounded-2xl text-sm break-words',
                isMine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-card border border-border rounded-bl-md',
                idx === 0 && (isMine ? 'rounded-tr-md' : 'rounded-tl-md'),
              )}
            >
              <span className="whitespace-pre-wrap">{m.content}</span>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className={cn('text-[10px] font-medium', isMine ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{formatTime(m.createdAt)}</span>
                {(isMine || canDeleteAll) && (
                  <button
                    onClick={() => { if (confirm('Delete this message?')) onDelete(m.id) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete message"
                  >
                    <Trash2 className={cn('size-3', isMine ? 'text-primary-foreground/70 hover:text-primary-foreground' : 'text-muted-foreground hover:text-destructive')} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
