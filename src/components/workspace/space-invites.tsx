'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Link2, Plus, Trash2, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from './types'
import { useDialogs } from '@/components/dashboard/use-dialogs'

type Invite = { id: string; label: string | null; url: string; maxUses: number | null; currentUses: number; expiresAt: string | null }

// Invite links for outside collaborators. Anyone with the link can join THIS space only (name + verified email).
export function SpaceInvites({ spaceId, spaceName }: { spaceId: string; spaceName: string }) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const { confirm, dialogs } = useDialogs()

  const load = useCallback(async () => {
    const r = await api(`/api/spaces/${spaceId}/invites`)
    if (r.ok) setInvites(r.data.invites)
    setLoaded(true)
  }, [spaceId])
  useEffect(() => { load() }, [load])

  const create = async () => {
    setBusy(true)
    const r = await api(`/api/spaces/${spaceId}/invites`, { method: 'POST', json: {} })
    setBusy(false)
    if (!r.ok) return toast.error(r.error)
    setInvites((p) => [r.data.invite, ...p])
  }
  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); toast.success('Link copied.') } catch { toast.error('Could not copy. Press and hold the link to copy it.') }
  }
  const share = async (url: string) => {
    if (navigator.share) { try { await navigator.share({ title: `Join ${spaceName}`, url }); return } catch { return } }
    copy(url)
  }
  const revoke = async (i: Invite) => {
    if (!(await confirm({ title: 'Turn off this link?', message: 'People who already joined stay in the space. The link stops working.', confirmLabel: 'Turn off', destructive: true }))) return
    const r = await api(`/api/spaces/${spaceId}/invites/${i.id}`, { method: 'DELETE' })
    if (!r.ok) return toast.error(r.error)
    setInvites((p) => p.filter((x) => x.id !== i.id))
  }

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      {dialogs}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold flex items-center gap-1.5"><Link2 className="size-4" />Invite link</div>
          <p className="text-xs text-muted-foreground mt-0.5">Anyone with the link joins this space only, with just their name and a verified email. They never see the rest of NEXORALABS.</p>
        </div>
        <Button size="sm" variant="outline" onClick={create} disabled={busy} className="gap-1 shrink-0"><Plus className="size-3.5" />New link</Button>
      </div>
      {loaded && !invites.length && <p className="text-xs text-muted-foreground">No active link. Create one to invite people from outside.</p>}
      {invites.map((i) => (
        <div key={i.id} className="space-y-2 rounded-lg bg-muted/50 p-2.5">
          <Input readOnly value={i.url} onFocus={(e) => e.currentTarget.select()} aria-label="Invite link" className="h-10 text-xs bg-background" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground flex-1 min-w-0 truncate">{i.currentUses} joined{i.maxUses ? ` of ${i.maxUses}` : ''}</span>
            <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => copy(i.url)}><Copy className="size-3.5" />Copy</Button>
            <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => share(i.url)}><Share2 className="size-3.5" />Share</Button>
            <Button size="icon" variant="ghost" className="size-9 text-destructive hover:text-destructive" onClick={() => revoke(i)} aria-label="Turn off link"><Trash2 className="size-4" /></Button>
          </div>
        </div>
      ))}
    </div>
  )
}
