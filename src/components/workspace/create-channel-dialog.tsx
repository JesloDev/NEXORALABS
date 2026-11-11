'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Hash, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { api } from './types'

export function CreateChannelDialog({ spaceId, open, onOpenChange, onCreated }: { spaceId: string; open: boolean; onOpenChange: (o: boolean) => void; onCreated: (chatId: string) => void }) {
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    const r = await api(`/api/spaces/${spaceId}/channels`, { method: 'POST', json: { name, topic, isPrivate } })
    setBusy(false)
    if (!r.ok) return toast.error(r.error)
    setName(''); setTopic(''); setIsPrivate(false)
    onCreated(r.data.chat.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
          <DialogDescription>Channels keep conversations about one topic together.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ch-name">Name</Label>
            <div className="relative">
              {isPrivate ? <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /> : <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />}
              <Input id="ch-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="design-reviews" className="pl-9" maxLength={40} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ch-topic">Topic (optional)</Label>
            <Input id="ch-topic" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Make private</div>
              <div className="text-xs text-muted-foreground">Only people you add (and org admins) can see it.</div>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} aria-label="Make channel private" />
          </div>
          <Button onClick={submit} disabled={busy || name.trim().length < 2} className="w-full">{busy ? 'Creating…' : 'Create channel'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
