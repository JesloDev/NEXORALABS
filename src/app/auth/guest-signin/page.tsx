'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, MailCheck } from 'lucide-react'
import { GuestShell } from '@/components/site/guest-shell'

export default function GuestSignIn() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [devUrl, setDevUrl] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const r = await fetch('/api/auth/guest-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
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
          {sent ? (
            <div className="text-center">
              <div className="mx-auto size-14 rounded-full bg-primary/10 flex items-center justify-center mb-4"><MailCheck className="size-7 text-primary" /></div>
              <h1 className="text-xl font-bold">Check your inbox</h1>
              <p className="mt-2 text-sm text-muted-foreground">If <span className="font-semibold text-foreground">{email}</span> belongs to a guest account, a sign-in link is on its way. It works once and expires in 15 minutes.</p>
              {devUrl && (
                <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-left">
                  <p className="font-medium text-amber-700 dark:text-amber-300 text-xs">Email service not configured. Sign-in link:</p>
                  <a href={devUrl} className="break-all text-primary underline text-xs mt-1 block">{devUrl}</a>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Guest sign-in</h1>
                <p className="text-sm text-muted-foreground mt-1">Enter the email you joined a space with and we'll send you a one-time sign-in link.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gs-email">Email</Label>
                <Input id="gs-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required className="h-11" placeholder="you@example.com" />
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full h-11 font-semibold">{busy && <Loader2 className="size-4 animate-spin mr-2" />}{busy ? 'Sending…' : 'Send sign-in link'}</Button>
              <p className="text-center text-sm text-muted-foreground">NEXORALABS team member? <Link href="/auth/signin" className="font-semibold text-primary hover:underline">Sign in here</Link></p>
            </form>
          )}
        </CardContent>
      </Card>
    </GuestShell>
  )
}
