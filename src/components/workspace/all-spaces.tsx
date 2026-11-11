'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Hash, FileText, Users, Lock, Menu, Plus, Search, ShieldCheck } from 'lucide-react'
import { SpaceTile } from './space-tile'
import type { SpaceSummary } from './types'

// Org-admin directory of EVERY space (including private ones they aren't in).
// Non-admins get the same view limited to spaces they can see ("Browse spaces").
export function AllSpaces({ spaces, isAdmin, onOpen, onCreate, onOpenSidebar }: {
  spaces: SpaceSummary[]; isAdmin: boolean; onOpen: (id: string) => void; onCreate: () => void; onOpenSidebar: () => void
}) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'mine' | 'other' | 'private'>('all')
  const list = useMemo(() => spaces.filter((s) => {
    if (q && !s.name.toLowerCase().includes(q.toLowerCase())) return false
    if (filter === 'mine') return s.isMember
    if (filter === 'other') return !s.isMember
    if (filter === 'private') return s.visibility === 'PRIVATE'
    return true
  }), [spaces, q, filter])

  return (
    <div className="h-full overflow-y-auto nexora-scroll">
      <header className="h-14 border-b border-border flex items-center gap-2 px-3 sm:px-5 sticky top-0 bg-background z-10">
        <Button variant="ghost" size="icon" className="md:hidden -ml-1" onClick={onOpenSidebar} aria-label="Open menu"><Menu className="size-5" /></Button>
        <h2 className="font-bold">{isAdmin ? 'All spaces' : 'Browse spaces'}</h2>
        {isAdmin && <Badge variant="outline" className="gap-1 text-[10px]"><ShieldCheck className="size-3" />Admin</Badge>}
        <div className="flex-1" />
        {isAdmin && <Button size="sm" onClick={onCreate} className="gap-1.5"><Plus className="size-4" />New space</Button>}
      </header>
      <div className="max-w-5xl mx-auto p-5 sm:p-8 space-y-4">
        <p className="text-sm text-muted-foreground">
          {isAdmin ? `Every space in NEXORALABS (${spaces.length}). Open any of them — including private spaces you haven't joined.` : 'Public spaces you can join, and the ones you belong to.'}
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search spaces…" className="pl-9" aria-label="Search spaces" />
          </div>
          {(['all', 'mine', 'other', 'private'] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} aria-pressed={filter === f}>
              {{ all: 'All', mine: 'Mine', other: 'Not joined', private: 'Private' }[f]}
            </Button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((s) => (
            <button key={s.id} onClick={() => onOpen(s.id)} className="text-left rounded-xl border border-border p-4 hover:border-primary/50 hover:bg-muted/40 transition flex gap-3">
              <SpaceTile name={s.name} icon={s.icon} color={s.color} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{s.name}</span>
                  {s.visibility === 'PRIVATE' && <Lock className="size-3.5 text-muted-foreground shrink-0" aria-label="Private" />}
                  {s.archived && <Badge variant="secondary" className="text-[10px]">Archived</Badge>}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">{s.description || 'No description.'}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="size-3" />{s.memberCount}</span>
                  <span className="flex items-center gap-1"><Hash className="size-3" />{s.channelCount}</span>
                  <span className="flex items-center gap-1"><FileText className="size-3" />{s.pageCount}</span>
                  <span className="flex-1" />
                  {s.isMember ? <Badge variant="secondary" className="text-[10px]">{s.role?.toLowerCase()}</Badge>
                    : s.viaAdmin ? <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400">not a member</Badge>
                    : <Badge variant="outline" className="text-[10px]">join</Badge>}
                </div>
              </div>
            </button>
          ))}
          {list.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground py-12">No spaces match.</p>}
        </div>
      </div>
    </div>
  )
}
