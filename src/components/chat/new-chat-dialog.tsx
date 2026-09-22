'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Check, Search, Users } from 'lucide-react'
import { toast } from 'sonner'

function initials(name: string) {
  return name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export function NewChatDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (chat: any) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [groupName, setGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (!cancelled && res.ok) setResults(data.users)
      } catch {}
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query])

  const startDirect = async () => {
    if (!selected) return toast.error('Select a person to chat with.')
    setCreating(true)
    try {
      const res = await fetch('/api/chats', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DIRECT', userId: selected }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Failed.')
      onCreated(data.chat)
      reset()
    } catch { toast.error('Network error.') }
    finally { setCreating(false) }
  }

  const createGroup = async () => {
    if (!groupName.trim()) return toast.error('Enter a group name.')
    if (groupMembers.length === 0) return toast.error('Add at least one member.')
    setCreating(true)
    try {
      const res = await fetch('/api/chats', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'GROUP', name: groupName, memberIds: groupMembers }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Failed.')
      onCreated(data.chat)
      reset()
    } catch { toast.error('Network error.') }
    finally { setCreating(false) }
  }

  const reset = () => {
    setQuery(''); setResults([]); setSelected(null); setGroupName(''); setGroupMembers([])
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start a new conversation</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="direct">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="direct">Direct chat</TabsTrigger>
            <TabsTrigger value="group">Group</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people..." className="pl-9" />
            </div>
            <div className="max-h-72 overflow-y-auto nexora-scroll space-y-1">
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelected(u.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${selected === u.id ? 'bg-primary/10 ring-1 ring-primary/20' : 'hover:bg-muted'}`}
                >
                  <Avatar className="size-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(u.name)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium truncate">{u.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.title || u.email}</div>
                  </div>
                  {selected === u.id && <Check className="size-4 text-primary" />}
                </button>
              ))}
              {!query && <div className="text-center text-sm text-muted-foreground py-8">Search for someone to chat with.</div>}
              {query && results.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">No users found.</div>}
            </div>
            <Button onClick={startDirect} disabled={creating || !selected} className="w-full bg-primary text-primary-foreground">
              {creating ? 'Creating...' : 'Start chat'}
            </Button>
          </TabsContent>

          <TabsContent value="group" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label htmlFor="gname">Group name</Label>
              <Input id="gname" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Engineering Team" />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Add members..." className="pl-9" />
            </div>
            <div className="max-h-56 overflow-y-auto nexora-scroll space-y-1">
              {results.filter((u) => !groupMembers.includes(u.id)).map((u) => (
                <button
                  key={u.id}
                  onClick={() => setGroupMembers((prev) => [...prev, u.id])}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left"
                >
                  <Avatar className="size-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(u.name)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.title || u.email}</div>
                  </div>
                </button>
              ))}
              {groupMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {groupMembers.map((id) => {
                    const u = results.find((r) => r.id === id)
                    return (
                      <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-1">
                        {u?.name}
                        <button onClick={() => setGroupMembers((prev) => prev.filter((m) => m !== id))} className="hover:text-destructive">✕</button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
            <Button onClick={createGroup} disabled={creating} className="w-full bg-primary text-primary-foreground">
              <Users className="size-4 mr-1.5" /> {creating ? 'Creating...' : 'Create group'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
