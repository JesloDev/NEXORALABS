'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowDown, ArrowUp, BarChart3, Copy, Download, Pencil, Plus, Trash2, Share2, X, ClipboardList, Star } from 'lucide-react'
import { toast } from 'sonner'
import { api } from './types'
import { useDialogs } from '@/components/dashboard/use-dialogs'
import { Q_TYPES, hasOptions, answerText, type Question, type QType } from '@/lib/forms'

type FormRow = { id: string; title: string; description: string | null; open: boolean; url: string; questionCount: number; responseCount: number; createdAt: string }
type View = { kind: 'list' } | { kind: 'build'; id: string | null } | { kind: 'responses'; form: FormRow }

const uid = () => 'q' + Math.random().toString(36).slice(2, 9)
const selectCls = 'h-11 sm:h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm'

export function FeedbackConsole({ spaceId }: { spaceId: string }) {
  const [view, setView] = useState<View>({ kind: 'list' })
  if (view.kind === 'build') return <Builder spaceId={spaceId} formId={view.id} onBack={() => setView({ kind: 'list' })} />
  if (view.kind === 'responses') return <Responses form={view.form} onBack={() => setView({ kind: 'list' })} />
  return <FormList spaceId={spaceId} onNew={() => setView({ kind: 'build', id: null })} onEdit={(id) => setView({ kind: 'build', id })} onResponses={(form) => setView({ kind: 'responses', form })} />
}

// ───────── list ─────────
function FormList({ spaceId, onNew, onEdit, onResponses }: { spaceId: string; onNew: () => void; onEdit: (id: string) => void; onResponses: (f: FormRow) => void }) {
  const [forms, setForms] = useState<FormRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const { confirm, dialogs } = useDialogs()
  const load = useCallback(async () => {
    const r = await api(`/api/spaces/${spaceId}/forms`)
    if (r.ok) setForms(r.data.forms); else toast.error(r.error)
    setLoaded(true)
  }, [spaceId])
  useEffect(() => { load() }, [load])

  const copy = async (url: string) => { try { await navigator.clipboard.writeText(url); toast.success('Link copied.') } catch { toast.error('Could not copy the link.') } }
  const share = async (f: FormRow) => { if (navigator.share) { try { await navigator.share({ title: f.title, url: f.url }); return } catch { return } } copy(f.url) }
  const toggle = async (f: FormRow) => {
    const r = await api(`/api/forms/${f.id}`, { method: 'PATCH', json: { open: !f.open } })
    r.ok ? (toast.success(f.open ? 'Form closed.' : 'Form reopened.'), load()) : toast.error(r.error)
  }
  const remove = async (f: FormRow) => {
    if (!(await confirm({ title: `Delete "${f.title}"?`, message: 'The form and all its responses are removed for good.', confirmLabel: 'Delete', destructive: true }))) return
    const r = await api(`/api/forms/${f.id}`, { method: 'DELETE' })
    r.ok ? load() : toast.error(r.error)
  }

  return (
    <div className="space-y-3">
      {dialogs}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-1.5"><ClipboardList className="size-4" />Feedback forms</h3>
          <p className="text-xs text-muted-foreground">Build a form, share its link, and read the responses here.</p>
        </div>
        <Button onClick={onNew} className="gap-1.5 shrink-0 h-10"><Plus className="size-4" />New form</Button>
      </div>
      {loaded && !forms.length && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No forms yet. Create your first one.</div>
      )}
      {forms.map((f) => (
        <div key={f.id} className="rounded-xl border border-border p-3.5 space-y-2.5">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{f.title}</div>
              <div className="text-xs text-muted-foreground">{f.questionCount} question{f.questionCount === 1 ? '' : 's'} · {f.responseCount} response{f.responseCount === 1 ? '' : 's'}</div>
            </div>
            <Badge variant={f.open ? 'secondary' : 'outline'} className="text-[10px]">{f.open ? 'Open' : 'Closed'}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="h-9 gap-1" onClick={() => onResponses(f)}><BarChart3 className="size-3.5" />Responses</Button>
            <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => onEdit(f.id)}><Pencil className="size-3.5" />Edit</Button>
            <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => copy(f.url)}><Copy className="size-3.5" />Copy link</Button>
            <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => share(f)}><Share2 className="size-3.5" />Share</Button>
            <Button size="sm" variant="ghost" className="h-9" onClick={() => toggle(f)}>{f.open ? 'Close' : 'Reopen'}</Button>
            <Button size="icon" variant="ghost" className="size-9 text-destructive hover:text-destructive" onClick={() => remove(f)} aria-label={`Delete ${f.title}`}><Trash2 className="size-4" /></Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ───────── builder ─────────
function Builder({ spaceId, formId, onBack }: { spaceId: string; formId: string | null; onBack: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<Question[]>(formId ? [] : [{ id: uid(), type: 'SHORT', label: '', required: false }])
  const [ready, setReady] = useState(!formId)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!formId) return
    api(`/api/forms/${formId}`).then((r) => {
      if (!r.ok) { toast.error(r.error); return onBack() }
      setTitle(r.data.form.title); setDescription(r.data.form.description || ''); setQuestions(r.data.form.questions); setReady(true)
    })
  }, [formId, onBack])

  const patchQ = (id: string, p: Partial<Question>) => setQuestions((qs) => qs.map((q) => {
    if (q.id !== id) return q
    const next = { ...q, ...p }
    if (p.type && hasOptions(p.type) && !next.options?.length) next.options = ['Option 1', 'Option 2']
    return next
  }))
  const move = (i: number, d: -1 | 1) => setQuestions((qs) => { const a = [...qs]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a })

  const save = async () => {
    if (title.trim().length < 2) return toast.error('Give the form a title.')
    if (!questions.length) return toast.error('Add at least one question.')
    setBusy(true)
    const body = { title, description, questions }
    const r = formId
      ? await api(`/api/forms/${formId}`, { method: 'PATCH', json: body })
      : await api(`/api/spaces/${spaceId}/forms`, { method: 'POST', json: body })
    setBusy(false)
    if (!r.ok) return toast.error(r.error)
    toast.success('Form saved.')
    onBack()
  }

  if (!ready) return <p className="text-sm text-muted-foreground">Loading…</p>
  return (
    <div className="space-y-4 max-w-2xl pb-10">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to forms" className="-ml-2"><ArrowLeft className="size-5" /></Button>
        <h3 className="font-semibold flex-1">{formId ? 'Edit form' : 'New form'}</h3>
        <Button onClick={save} disabled={busy} className="h-10">{busy ? 'Saving…' : 'Save'}</Button>
      </div>
      <div className="rounded-xl border border-border p-3.5 space-y-2.5 border-t-4 border-t-primary">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Form title" maxLength={120} className="h-11 text-base font-semibold" aria-label="Form title" />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} maxLength={1000} aria-label="Form description" />
      </div>
      {questions.map((q, i) => (
        <div key={q.id} className="rounded-xl border border-border p-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={q.label} onChange={(e) => patchQ(q.id, { label: e.target.value })} placeholder={`Question ${i + 1}`} maxLength={300} className="h-11 sm:h-9 flex-1" aria-label={`Question ${i + 1} title`} />
            <select value={q.type} onChange={(e) => patchQ(q.id, { type: e.target.value as QType })} className={`${selectCls} sm:w-44`} aria-label="Question type">
              {Q_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {hasOptions(q.type) && (
            <div className="space-y-1.5">
              {(q.options || []).map((o, oi) => (
                <div key={oi} className="flex items-center gap-1.5">
                  <Input value={o} onChange={(e) => patchQ(q.id, { options: q.options!.map((x, k) => (k === oi ? e.target.value : x)) })} className="h-10 sm:h-9" maxLength={120} aria-label={`Option ${oi + 1}`} />
                  <Button size="icon" variant="ghost" className="size-9 shrink-0" disabled={(q.options?.length ?? 0) <= 2} onClick={() => patchQ(q.id, { options: q.options!.filter((_, k) => k !== oi) })} aria-label="Remove option"><X className="size-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="h-9 gap-1" disabled={(q.options?.length ?? 0) >= 30} onClick={() => patchQ(q.id, { options: [...(q.options || []), `Option ${(q.options?.length ?? 0) + 1}`] })}><Plus className="size-3.5" />Add option</Button>
            </div>
          )}
          {q.type === 'RATING' && <p className="text-xs text-muted-foreground flex items-center gap-1"><Star className="size-3.5" />Respondents pick 1 to 5 stars.</p>}
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <label className="flex items-center gap-2 text-sm flex-1 min-h-10 cursor-pointer">
              <input type="checkbox" checked={q.required} onChange={(e) => patchQ(q.id, { required: e.target.checked })} className="size-4 accent-[var(--primary)]" />Required
            </label>
            <Button size="icon" variant="ghost" className="size-9" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="size-4" /></Button>
            <Button size="icon" variant="ghost" className="size-9" disabled={i === questions.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="size-4" /></Button>
            <Button size="icon" variant="ghost" className="size-9" onClick={() => setQuestions((qs) => { const a = [...qs]; a.splice(i + 1, 0, { ...q, id: uid() }); return a })} aria-label="Duplicate question"><Copy className="size-4" /></Button>
            <Button size="icon" variant="ghost" className="size-9 text-destructive hover:text-destructive" onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))} aria-label="Delete question"><Trash2 className="size-4" /></Button>
          </div>
        </div>
      ))}
      <Button variant="outline" className="w-full h-11 gap-1.5" disabled={questions.length >= 50} onClick={() => setQuestions((qs) => [...qs, { id: uid(), type: 'SHORT', label: '', required: false }])}><Plus className="size-4" />Add question</Button>
    </div>
  )
}

// ───────── responses ─────────
type Resp = { id: string; createdAt: string; answers: Record<string, any> }

function Responses({ form, onBack }: { form: FormRow; onBack: () => void }) {
  const [data, setData] = useState<{ questions: Question[]; responses: Resp[] } | null>(null)
  const [tab, setTab] = useState<'summary' | 'individual'>('summary')
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    api(`/api/forms/${form.id}/responses`).then((r) => r.ok ? setData(r.data) : (toast.error(r.error), onBack()))
  }, [form.id, onBack])

  const summary = useMemo(() => {
    if (!data) return []
    return data.questions.map((q) => {
      const answers = data.responses.map((r) => r.answers[q.id]).filter((a) => a !== undefined)
      if (q.type === 'SHORT' || q.type === 'LONG') return { q, kind: 'text' as const, texts: answers.map(answerText), count: answers.length }
      if (q.type === 'RATING') {
        const nums = answers.map(Number)
        const dist = [1, 2, 3, 4, 5].map((n) => ({ label: `${n}★`, n: nums.filter((x) => x === n).length }))
        return { q, kind: 'bars' as const, bars: dist, count: nums.length, avg: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0 }
      }
      const bars = (q.options || []).map((o) => ({ label: o, n: answers.filter((a) => (Array.isArray(a) ? a.includes(o) : a === o)).length }))
      return { q, kind: 'bars' as const, bars, count: answers.length, avg: 0 }
    })
  }, [data])

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>
  const total = data.responses.length
  const cur = data.responses[idx]
  return (
    <div className="space-y-4 max-w-2xl pb-10">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to forms" className="-ml-2"><ArrowLeft className="size-5" /></Button>
        <div className="flex-1 min-w-0"><h3 className="font-semibold truncate">{form.title}</h3><p className="text-xs text-muted-foreground">{total} response{total === 1 ? '' : 's'}</p></div>
        {total > 0 && <Button asChild variant="outline" size="sm" className="h-9 gap-1"><a href={`/api/forms/${form.id}/responses?format=csv`}><Download className="size-3.5" />CSV</a></Button>}
      </div>
      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No responses yet. Share the form link to collect some.</div>
      ) : (
        <>
          <div className="inline-flex rounded-lg bg-muted p-1 text-sm">
            {(['summary', 'individual'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3.5 h-9 rounded-md capitalize ${tab === t ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>{t}</button>
            ))}
          </div>
          {tab === 'summary' && summary.map((s) => (
            <div key={s.q.id} className="rounded-xl border border-border p-3.5 space-y-2">
              <div className="text-sm font-medium">{s.q.label}</div>
              <div className="text-xs text-muted-foreground">{s.count} answer{s.count === 1 ? '' : 's'}{s.kind === 'bars' && s.q.type === 'RATING' && s.count ? ` · average ${s.avg.toFixed(1)} / 5` : ''}</div>
              {s.kind === 'bars' ? s.bars.map((b) => (
                <div key={b.label} className="space-y-0.5">
                  <div className="flex justify-between text-xs"><span className="truncate pr-2">{b.label}</span><span className="text-muted-foreground">{b.n}</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${s.count ? (b.n / s.count) * 100 : 0}%` }} /></div>
                </div>
              )) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {s.texts.map((t, i) => <div key={i} className="text-sm rounded-lg bg-muted/60 px-2.5 py-1.5 whitespace-pre-wrap break-words">{t}</div>)}
                </div>
              )}
            </div>
          ))}
          {tab === 'individual' && cur && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-9" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Prev</Button>
                <div className="flex-1 text-center text-xs text-muted-foreground">Response {idx + 1} of {total} · {new Date(cur.createdAt).toLocaleString()}</div>
                <Button size="sm" variant="outline" className="h-9" disabled={idx >= total - 1} onClick={() => setIdx(idx + 1)}>Next</Button>
              </div>
              {data.questions.map((q) => (
                <div key={q.id} className="rounded-xl border border-border p-3.5">
                  <div className="text-xs text-muted-foreground">{q.label}</div>
                  <div className="text-sm mt-1 whitespace-pre-wrap break-words">{cur.answers[q.id] === undefined ? <span className="text-muted-foreground">No answer</span> : answerText(cur.answers[q.id])}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
