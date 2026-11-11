'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Crown, UserPlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { DashboardUser } from '@/components/dashboard/dashboard-app'
import { api, initials } from './types'

export function ChatMembersDialog({ open, onOpenChange, chat, currentUser, online, onChanged }: {
  open: boolean; onOpenChange: (o: boolean) => void; chat: any; currentUser: DashboardUser; online: Set<string>; onChanged: () => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])
  const memberIds = new Set<string>(chat.members.map((m: any) => m.id))

  const search = async (value: string) => {
    setQ(value)
    if (!value.trim()) return setResults([])
    const r = await api(`/api/users?q=${encodeURIComponent(value)}`)
    if (r.ok) setResults(r.data.users.filter((u: any) => !memberIds.has(u.id)))
  }
  const add = async (userId: string) => {
    const r = await api(`/api/chats/${chat.id}/members`, { method: 'POST', json: { userIds: [userId] } })
    if (!r.ok) return toast.error(r.error)
    if (r.data.added === 0 && chat.type === 'CHANNEL') return toast.error('Add them to the space first — channel members must belong to the space.')
    toast.success('Added.'); setResults((p) => p.filter((u) => u.id !== userId)); onChanged()
  }
  const remove = async (userId: string) => {
    if (!confirm('Remove this member?')) return
    const r = await api(`/api/chats/${chat.id}/members/${userId}`, { method: 'DELETE' })
    r.ok ? (toast.success('Removed.'), onChanged()) : toast.error(r.error)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{chat.type === 'CHANNEL' ? `#${chat.name}` : chat.name} · {chat.members.length} members</DialogTitle></DialogHeader>
        {chat.canModerate && (
          <div className="space-y-2">
            <Input value={q} onChange={(e) => search(e.target.value)} placeholder="Add people by name or email…" aria-label="Search people to add" />
            {results.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-muted">
                <Avatar className="size-8"><AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{u.name}</div><div className="text-xs text-muted-foreground truncate">{u.email}</div></div>
                <Button size="sm" variant="ghost" onClick={() => add(u.id)} aria-label={`Add ${u.name}`}><UserPlus className="size-4" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="max-h-72 overflow-y-auto nexora-scroll space-y-0.5">
          {chat.members.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-muted/60">
              <div className="relative">
                <Avatar className="size-8"><AvatarImage src={m.image || undefined} /><AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(m.name)}</AvatarFallback></Avatar>
                {online.has(m.id) && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-green-500 ring-2 ring-background" aria-label="Online" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-1">{m.name}{m.memberRole === 'ADMIN' && <Crown className="size-3 text-amber-500" aria-label="Admin" />}</div>
                <div className="text-xs text-muted-foreground truncate">{m.title || m.email}</div>
              </div>
              {chat.canModerate && m.id !== currentUser.id && (
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(m.id)} aria-label={`Remove ${m.name}`}><Trash2 className="size-4" /></Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
