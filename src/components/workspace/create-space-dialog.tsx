'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { api, SPACE_COLORS } from './types'
import { SpaceTile } from './space-tile'
import { cn } from '@/lib/utils'

export function CreateSpaceDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (spaceId: string) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState(SPACE_COLORS[0])
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    const r = await api('/api/spaces', { method: 'POST', json: { name, description, icon, color, visibility } })
    setBusy(false)
    if (!r.ok) return toast.error(r.error)
    toast.success(`Space "${name}" created.`)
    setName(''); setDescription(''); setIcon('')
    onCreated(r.data.space.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create a space</DialogTitle>
          <DialogDescription>A space is a company or team partition with its own channels, pages and members.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <SpaceTile name={name || 'S'} icon={icon} color={color} size={48} />
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="sp-name">Name</Label>
              <Input id="sp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engineering" maxLength={60} />
            </div>
            <div className="w-16 space-y-1.5">
              <Label htmlFor="sp-icon">Emoji</Label>
              <Input id="sp-icon" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🚀" maxLength={4} className="text-center" />
            </div>
          </div>
          <div className="flex gap-2" role="radiogroup" aria-label="Space color">
            {SPACE_COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} onClick={() => setColor(c)}
                className={cn('size-7 rounded-full ring-offset-2 ring-offset-background transition', color === c && 'ring-2 ring-foreground')} style={{ background: c }} />
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-desc">Description (optional)</Label>
            <Textarea id="sp-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What is this space for?" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['PUBLIC', 'PRIVATE'] as const).map((v) => (
              <button key={v} type="button" onClick={() => setVisibility(v)}
                className={cn('rounded-lg border p-3 text-left transition', visibility === v ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted')}>
                <div className="text-sm font-semibold">{v === 'PUBLIC' ? 'Public' : 'Private'}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{v === 'PUBLIC' ? 'Anyone at NEXORALABS can find and join.' : 'Invite only. Admins can still open it.'}</div>
              </button>
            ))}
          </div>
          <Button onClick={submit} disabled={busy || name.trim().length < 2} className="w-full">{busy ? 'Creating…' : 'Create space'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
