'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Hash, FileText, MessageSquare } from 'lucide-react'
import { api } from './types'

export interface SearchHit { kind: 'page' | 'message'; id: string; spaceId: string | null; chatId?: string; title: string; sub: string }

export function SearchDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (h: SearchHit) => void }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); setSearched(false); return }
    let cancelled = false
    const t = setTimeout(async () => {
      const r = await api(`/api/search?q=${encodeURIComponent(q.trim())}`)
      if (cancelled || !r.ok) return
      setHits([
        ...r.data.pages.map((p: any): SearchHit => ({ kind: 'page', id: p.id, spaceId: p.spaceId, title: `${p.icon || '📄'} ${p.title}`, sub: p.space.name })),
        ...r.data.messages.map((m: any): SearchHit => ({
          kind: 'message', id: m.id, chatId: m.chat.id, spaceId: m.chat.spaceId,
          title: m.content.length > 90 ? m.content.slice(0, 90) + '…' : m.content,
          sub: `${m.sender.name} · ${m.chat.type === 'CHANNEL' ? '#' + m.chat.name : m.chat.name || 'direct message'}`,
        })),
      ])
      setSearched(true)
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [q])

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setQ(''); setHits([]) } }}>
      <DialogContent className="max-w-lg top-[20%] translate-y-0">
        <DialogHeader><DialogTitle>Search</DialogTitle></DialogHeader>
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages and pages…" aria-label="Search" />
        <div className="max-h-80 overflow-y-auto nexora-scroll -mx-1">
          {hits.map((h) => (
            <button key={`${h.kind}-${h.id}`} onClick={() => { onPick(h); onOpenChange(false) }} className="w-full flex items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted">
              {h.kind === 'page' ? <FileText className="size-4 mt-0.5 shrink-0 text-muted-foreground" /> : h.sub.includes('#') ? <Hash className="size-4 mt-0.5 shrink-0 text-muted-foreground" /> : <MessageSquare className="size-4 mt-0.5 shrink-0 text-muted-foreground" />}
              <div className="min-w-0"><div className="text-sm truncate">{h.title}</div><div className="text-xs text-muted-foreground truncate">{h.sub}</div></div>
            </button>
          ))}
          {searched && hits.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No results.</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
