'use client'

import { use, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Loader2, LinkIcon, Star } from 'lucide-react'
import { GuestShell } from '@/components/site/guest-shell'
import type { Question } from '@/lib/forms'

type Form = { title: string; description: string | null; questions: Question[] }
type Val = string | string[] | number

export default function PublicForm({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [form, setForm] = useState<Form | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, Val>>({})
  const [website, setWebsite] = useState('') // honeypot
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch(`/api/f/${token}`).then(async (r) => {
      const d = await r.json().catch(() => ({}))
      if (r.ok) setForm(d.form); else setProblem(d.error || 'This form is not available.')
    }).catch(() => setProblem('Could not load the form. Check your connection and try again.'))
  }, [token])

  const set = (id: string, v: Val) => setAnswers((a) => ({ ...a, [id]: v }))
  const toggle = (id: string, o: string) => {
    const cur = (answers[id] as string[] | undefined) || []
    set(id, cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o])
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    for (const q of form.questions) {
      const v = answers[q.id]
      if (q.required && (v === undefined || v === '' || (Array.isArray(v) && !v.length))) { setError(`Please answer: ${q.label}`); return }
    }
    setError(''); setBusy(true)
    try {
      const r = await fetch(`/api/f/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers, website }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) return setError(d.error || 'Something went wrong.')
      setDone(true)
    } catch { setError('Network error. Please try again.') } finally { setBusy(false) }
  }

  return (
    <GuestShell>
      {!form && !problem && <div className="py-16 flex justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>}
      {problem && (
        <Card><CardContent className="p-8 text-center">
          <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center mb-3"><LinkIcon className="size-6 text-muted-foreground" /></div>
          <h1 className="text-lg font-bold">Form unavailable</h1><p className="mt-1 text-sm text-muted-foreground">{problem}</p>
        </CardContent></Card>
      )}
      {form && done && (
        <Card><CardContent className="p-8 text-center">
          <CheckCircle2 className="size-12 text-primary mx-auto mb-3" />
          <h1 className="text-xl font-bold">Thank you</h1><p className="mt-1 text-sm text-muted-foreground">Your response has been recorded.</p>
        </CardContent></Card>
      )}
      {form && !done && (
        <form onSubmit={submit} className="space-y-3">
          <Card className="border-t-4 border-t-primary"><CardContent className="p-5">
            <h1 className="text-xl font-bold">{form.title}</h1>
            {form.description && <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">{form.description}</p>}
            <p className="mt-2 text-xs text-destructive">* Required</p>
          </CardContent></Card>
          {form.questions.map((q) => (
            <Card key={q.id}><CardContent className="p-5 space-y-3">
              <div className="text-sm font-medium">{q.label}{q.required && <span className="text-destructive"> *</span>}</div>
              {q.type === 'SHORT' && <Input value={(answers[q.id] as string) || ''} onChange={(e) => set(q.id, e.target.value)} maxLength={500} className="h-11" aria-label={q.label} />}
              {q.type === 'LONG' && <Textarea value={(answers[q.id] as string) || ''} onChange={(e) => set(q.id, e.target.value)} rows={4} maxLength={5000} aria-label={q.label} />}
              {q.type === 'CHOICE' && (
                <div className="space-y-1" role="radiogroup" aria-label={q.label}>
                  {q.options!.map((o) => (
                    <label key={o} className="flex items-center gap-3 min-h-11 cursor-pointer text-sm">
                      <input type="radio" name={q.id} checked={answers[q.id] === o} onChange={() => set(q.id, o)} className="size-4 accent-[var(--primary)]" />{o}
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'CHECKBOX' && (
                <div className="space-y-1">
                  {q.options!.map((o) => (
                    <label key={o} className="flex items-center gap-3 min-h-11 cursor-pointer text-sm">
                      <input type="checkbox" checked={((answers[q.id] as string[]) || []).includes(o)} onChange={() => toggle(q.id, o)} className="size-4 accent-[var(--primary)]" />{o}
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'DROPDOWN' && (
                <select value={(answers[q.id] as string) || ''} onChange={(e) => set(q.id, e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-2.5 text-sm" aria-label={q.label}>
                  <option value="">Choose…</option>
                  {q.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
              {q.type === 'RATING' && (
                <div className="flex gap-1" role="radiogroup" aria-label={q.label}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button type="button" key={n} onClick={() => set(q.id, n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} aria-checked={answers[q.id] === n} role="radio" className="p-1.5">
                      <Star className={`size-8 ${Number(answers[q.id] || 0) >= n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                </div>
              )}
            </CardContent></Card>
          ))}
          <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full h-12 font-semibold">{busy && <Loader2 className="size-4 animate-spin mr-2" />}{busy ? 'Submitting…' : 'Submit'}</Button>
        </form>
      )}
    </GuestShell>
  )
}
