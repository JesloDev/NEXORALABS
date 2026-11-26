'use client'

import { use, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, MailCheck, LinkIcon } from 'lucide-react'
import { GuestShell } from '@/components/site/guest-shell'
import { SpaceTile } from '@/components/workspace/space-tile'

type Info = { name: string; icon: string | null; color: string | null; description: string | null }

export default function JoinSpacePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [info, setInfo] = useState<Info | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [devUrl, setDevUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/space-invites/${token}`).then(async (r) => {
      const d = await r.json().catch(() => ({}))
      if (r.ok) setInfo(d.space); else setProblem(d.error || 'This invite link is not valid.')
    }).catch(() => setProblem('Could not load this invite. Check your connection and try again.'))
  }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const r = await fetch(`/api/space-invites/${token}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) return setError(d.error || 'Something went wrong.')
      if (d.devUrl) setDevUrl(d.devUrl)
      setSent(true)
    } catch { setError('Network error. Please try again.') } finally { setBusy(false) }
  }

  return (
    <GuestShell>
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-6 sm:p-8">
          {!info && !problem && <div className="py-10 flex justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>}
          {problem && (
            <div className="text-center py-4">
              <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center mb-3"><LinkIcon className="size-6 text-muted-foreground" /></div>
              <h1 className="text-lg font-bold">Link unavailable</h1>
              <p className="mt-1 text-sm text-muted-foreground">{problem}</p>
              <p className="mt-3 text-xs text-muted-foreground">Ask the person who invited you for a new link.</p>
            </div>
          )}
          {info && !sent && (
            <form onSubmit={submit} className="space-y-4">
              <div className="flex items-center gap-3">
                <SpaceTile name={info.name} icon={info.icon} color={info.color} size={52} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">You're invited to join</p>
                  <h1 className="text-xl font-bold leading-tight truncate">{info.name}</h1>
                </div>
              </div>
              {info.description && <p className="text-sm text-muted-foreground">{info.description}</p>}
              <div className="space-y-1.5">
                <Label htmlFor="g-name">Your name</Label>
                <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Full name" required minLength={2} maxLength={60} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-email">Email</Label>
                <Input id="g-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="you@example.com" required className="h-11" />
                <p className="text-xs text-muted-foreground">We'll email you a link to confirm it's you. No password needed.</p>
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full h-11 font-semibold">{busy && <Loader2 className="size-4 animate-spin mr-2" />}{busy ? 'Sending…' : 'Continue'}</Button>
            </form>
          )}
          {info && sent && (
            <div className="text-center py-2">
              <div className="mx-auto size-14 rounded-full bg-primary/10 flex items-center justify-center mb-4"><MailCheck className="size-7 text-primary" /></div>
              <h1 className="text-xl font-bold">Check your inbox</h1>
              <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link to <span className="font-semibold text-foreground">{email}</span>. Open it to join <span className="font-semibold text-foreground">{info.name}</span>. It expires in 1 hour.</p>
              {devUrl && (
                <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-left">
                  <p className="font-medium text-amber-700 dark:text-amber-300 text-xs">Email service not configured. Confirmation link:</p>
                  <a href={devUrl} className="break-all text-primary underline text-xs mt-1 block">{devUrl}</a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </GuestShell>
  )
}
