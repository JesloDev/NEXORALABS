'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FilePlus2, Trash2, Menu, Check, Loader2, Eye, Pencil, Columns2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { api } from './types'

type Mode = 'edit' | 'split' | 'preview'
interface PageData { id: string; title: string; icon?: string | null; content: string; updatedAt: string; updater?: { name: string } | null; creator?: { name: string } }

export function PagePane({ pageId, spaceName, onSaved, onAddChild, onDeleted, onOpenSidebar }: {
  pageId: string; spaceName: string
  onSaved: () => void; onAddChild: (parentId: string) => void; onDeleted: () => void; onOpenSidebar: () => void
}) {
  const [page, setPage] = useState<PageData | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('')
  const [content, setContent] = useState('')
  const [mode, setMode] = useState<Mode>('split')
  const [state, setState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle')
  const [missing, setMissing] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef({ title: '', icon: '', content: '', id: '' })
  const dirty = useRef(false)

  const flush = useCallback(async () => {
    if (!dirty.current) return
    const { id, title, icon, content } = latest.current
    dirty.current = false
    setState('saving')
    const r = await api(`/api/pages/${id}`, { method: 'PATCH', json: { title, icon, content } })
    if (!r.ok) { dirty.current = true; setState('error'); return toast.error(r.error) }
    setState('saved'); onSaved()
  }, [onSaved])

  // load (and flush the previous page before switching)
  useEffect(() => {
    let cancelled = false
    setPage(null); setMissing(false); setState('idle')
    ;(async () => {
      const r = await api(`/api/pages/${pageId}`)
      if (cancelled) return
      if (!r.ok) return setMissing(true)
      setPage(r.data.page); setCanEdit(r.data.canEdit)
      setTitle(r.data.page.title); setIcon(r.data.page.icon || ''); setContent(r.data.page.content)
      latest.current = { id: pageId, title: r.data.page.title, icon: r.data.page.icon || '', content: r.data.page.content }
    })()
    return () => { cancelled = true; if (timer.current) clearTimeout(timer.current); flush() }
  }, [pageId]) // eslint-disable-line react-hooks/exhaustive-deps

  const change = (patch: Partial<{ title: string; icon: string; content: string }>) => {
    latest.current = { ...latest.current, ...patch }
    dirty.current = true
    setState('dirty')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, 800)
  }

  // best-effort flush when the tab closes
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty.current) { flush(); e.preventDefault() } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [flush])

  const del = async () => {
    if (!confirm('Delete this page and all its sub-pages?')) return
    const r = await api(`/api/pages/${pageId}`, { method: 'DELETE' })
    if (!r.ok) return toast.error(r.error)
    dirty.current = false
    onDeleted()
  }

  if (missing) return <div className="flex-1 flex items-center justify-center text-muted-foreground">This page doesn't exist or you can't access it.</div>
  if (!page) return <div className="flex-1 flex items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 h-14 border-b border-border flex items-center gap-2 px-3 sm:px-5">
        <Button variant="ghost" size="icon" className="md:hidden -ml-1" onClick={onOpenSidebar} aria-label="Open menu"><Menu className="size-5" /></Button>
        <span className="text-sm text-muted-foreground truncate">{spaceName} /</span>
        <span className="text-sm font-medium truncate">{title || 'Untitled'}</span>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground flex items-center gap-1 mr-2" aria-live="polite">
          {state === 'saving' && <><Loader2 className="size-3 animate-spin" />Saving…</>}
          {state === 'dirty' && 'Unsaved…'}
          {state === 'saved' && <><Check className="size-3" />Saved</>}
          {state === 'error' && <span className="text-destructive">Save failed</span>}
        </span>
        {canEdit && (
          <div className="hidden sm:flex rounded-lg border border-border p-0.5" role="group" aria-label="Editor mode">
            {([['edit', Pencil, 'Edit'], ['split', Columns2, 'Split'], ['preview', Eye, 'Preview']] as const).map(([m, Icon, label]) => (
              <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} aria-label={label}
                className={cn('p-1.5 rounded-md', mode === m ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}><Icon className="size-3.5" /></button>
            ))}
          </div>
        )}
        {canEdit && <Button variant="ghost" size="sm" onClick={() => onAddChild(pageId)} className="gap-1.5"><FilePlus2 className="size-4" /><span className="hidden sm:inline">Sub-page</span></Button>}
        <Button variant="ghost" size="icon" onClick={del} aria-label="Delete page" className="text-destructive hover:text-destructive"><Trash2 className="size-4" /></Button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto nexora-scroll">
        <div className="max-w-5xl mx-auto px-5 sm:px-10 py-8">
          <div className="flex items-start gap-3">
            <Input value={icon} onChange={(e) => { setIcon(e.target.value); change({ icon: e.target.value }) }} disabled={!canEdit} maxLength={4} placeholder="📄" aria-label="Page icon"
              className="w-14 h-14 text-2xl text-center border-transparent hover:border-input px-0 shadow-none" />
            <input value={title} onChange={(e) => { setTitle(e.target.value); change({ title: e.target.value }) }} disabled={!canEdit} placeholder="Untitled" aria-label="Page title"
              className="flex-1 bg-transparent text-4xl font-extrabold tracking-tight outline-none placeholder:text-muted-foreground/50 py-1" />
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-[68px]">
            Last edited {new Date(page.updatedAt).toLocaleString()}{page.updater ? ` by ${page.updater.name}` : ''}
          </p>

          <div className={cn('mt-6 grid gap-6', canEdit && mode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1')}>
            {canEdit && mode !== 'preview' && (
              <textarea value={content} onChange={(e) => { setContent(e.target.value); change({ content: e.target.value }) }} aria-label="Page content (Markdown)"
                placeholder="Write in Markdown…  # Heading · **bold** · - list · `code`"
                className="w-full min-h-[60vh] resize-y rounded-xl border border-input bg-background p-4 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring" />
            )}
            {(!canEdit || mode !== 'edit') && (
              <div className="nexora-prose min-h-[40vh]">
                {content.trim() ? <ReactMarkdown components={{ a: ({ node, ...p }) => <a {...p} target="_blank" rel="noopener noreferrer nofollow" /> }}>{content}</ReactMarkdown>
                  : <p className="text-muted-foreground">Nothing here yet.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
