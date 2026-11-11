'use client'

import { useMemo, useState } from 'react'
import { Hash, Lock, ChevronRight, Plus, FilePlus2, Home, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SpaceTile } from './space-tile'
import type { Main, PageNode, SpaceDetail } from './types'

function Row({ active, onClick, children, className }: { active?: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined}
      className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-left transition-colors', active ? 'bg-primary/10 text-foreground font-semibold' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground', className)}>
      {children}
    </button>
  )
}

export function SpaceSidebar({ detail, main, onSelect, onCreateChannel, onCreatePage, onJoinSpace, canCreate }: {
  detail: SpaceDetail; main: Main; canCreate: boolean
  onSelect: (m: Main) => void; onCreateChannel: () => void; onCreatePage: (parentId: string | null) => void; onJoinSpace: () => void
}) {
  const { space, access, channels, pages } = detail
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const children = useMemo(() => {
    const m = new Map<string | null, PageNode[]>()
    pages.forEach((p) => m.set(p.parentId, [...(m.get(p.parentId) || []), p]))
    return m
  }, [pages])

  const renderPages = (parent: string | null, depth: number): React.ReactNode =>
    (children.get(parent) || []).map((p) => {
      const kids = children.get(p.id) || []
      const expanded = open[p.id] ?? depth === 0
      return (
        <div key={p.id}>
          <div className="group flex items-center" style={{ paddingLeft: depth * 12 }}>
            <button className={cn('p-1 rounded hover:bg-muted', !kids.length && 'invisible')} onClick={() => setOpen((o) => ({ ...o, [p.id]: !expanded }))} aria-label={expanded ? 'Collapse' : 'Expand'} aria-expanded={expanded}>
              <ChevronRight className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} />
            </button>
            <Row active={main.kind === 'page' && main.id === p.id} onClick={() => onSelect({ kind: 'page', id: p.id })} className="flex-1 min-w-0">
              <span className="shrink-0 w-4 text-center">{p.icon || '📄'}</span><span className="truncate">{p.title || 'Untitled'}</span>
            </Row>
            {canCreate && <button className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted" onClick={() => { setOpen((o) => ({ ...o, [p.id]: true })); onCreatePage(p.id) }} aria-label={`Add sub-page to ${p.title}`}><Plus className="size-3.5" /></button>}
          </div>
          {kids.length > 0 && expanded && renderPages(p.id, depth + 1)}
        </div>
      )
    })

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <SpaceTile name={space.name} icon={space.icon} color={space.color} size={36} />
          <div className="min-w-0 flex-1">
            <div className="font-bold truncate leading-tight">{space.name}</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">{space.visibility === 'PRIVATE' ? <><Lock className="size-3" />Private</> : 'Public'} · {detail.members.length} members</div>
          </div>
        </div>
        {access.viaAdmin && (
          <div className="mt-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
            <ShieldCheck className="size-3.5 mt-0.5 shrink-0" /><span>Admin view — you're not a member of this space.</span>
          </div>
        )}
        {!access.isMember && access.canJoin && <Button size="sm" className="w-full mt-2.5" onClick={onJoinSpace}>{access.viaAdmin ? 'Join as admin' : 'Join space'}</Button>}
      </div>

      <div className="flex-1 overflow-y-auto nexora-scroll p-2 space-y-4">
        <div className="space-y-0.5">
          <Row active={main.kind === 'space-home'} onClick={() => onSelect({ kind: 'space-home' })}><Home className="size-4" />Overview & members</Row>
        </div>

        <section aria-label="Channels">
          <div className="flex items-center justify-between px-2.5 mb-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Channels</h3>
            {canCreate && <button onClick={onCreateChannel} className="p-0.5 rounded hover:bg-muted text-muted-foreground" aria-label="Create channel"><Plus className="size-4" /></button>}
          </div>
          {channels.length === 0 && <p className="px-2.5 text-xs text-muted-foreground">No channels yet.</p>}
          {channels.map((c) => {
            const active = main.kind === 'chat' && main.id === c.id
            return (
              <Row key={c.id} active={active} onClick={() => onSelect({ kind: 'chat', id: c.id })} className={cn(!c.isMember && 'opacity-70', c.unread > 0 && !active && 'text-foreground font-semibold')}>
                {c.isPrivate ? <Lock className="size-4 shrink-0" /> : <Hash className="size-4 shrink-0" />}
                <span className="truncate flex-1">{c.name}</span>
                {!c.isMember && <span className="text-[10px] text-muted-foreground">{access.viaAdmin ? 'admin' : 'join'}</span>}
                {c.unread > 0 && <Badge className="h-4 min-w-4 px-1 text-[10px] rounded-full">{c.unread}</Badge>}
              </Row>
            )
          })}
        </section>

        <section aria-label="Pages">
          <div className="flex items-center justify-between px-2.5 mb-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pages</h3>
            {canCreate && <button onClick={() => onCreatePage(null)} className="p-0.5 rounded hover:bg-muted text-muted-foreground" aria-label="Create page"><FilePlus2 className="size-4" /></button>}
          </div>
          {pages.length === 0 && <p className="px-2.5 text-xs text-muted-foreground">No pages yet.</p>}
          {renderPages(null, 0)}
        </section>
      </div>
    </div>
  )
}
