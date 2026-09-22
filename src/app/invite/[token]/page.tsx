'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/site/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

export default function InvitePage() {
  const params = useParams<{ token: string }>()
  const token = params.token
  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<any>(null)
  const [invalid, setInvalid] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', title: '', department: '', phone: '' })

  useEffect(() => {
    if (!token) return
    ;(async () => {
      try {
        const res = await fetch(`/api/invite/${token}`)
        const data = await res.json()
        if (!res.ok || !data.ok) {
          setInvalid(data.error || 'This invite link is not available.')
        } else {
          setInvite(data.invite)
          if (data.expired) {
            const reasons = []
            if (data.reasons.expiredByDate) reasons.push('it has expired')
            if (data.reasons.exhausted) reasons.push('it reached its maximum uses')
            if (data.reasons.inactive) reasons.push('it has been revoked')
            setInvalid(`This invite link is no longer valid because ${reasons.join(' and ')}.`)
          }
        }
      } catch {
        setInvalid('Unable to validate this invite link.')
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters.')
    setSubmitting(true)
    try {
      const res = await fetch('/api/invite/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form, email: form.email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Registration failed.')
        return
      }
      setDone(true)
      if (data.devVerifyUrl) setDevVerifyUrl(data.devVerifyUrl)
      toast.success('Registered! Verify your email to continue.')
    } catch {
      toast.error('Network error.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <Badge variant="secondary" className="gap-1.5"><ShieldCheck className="size-3.5 text-primary" /> Invite-only</Badge>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-lg">
          {loading ? (
            <div className="text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="size-5 animate-spin" /> Validating invite link...
            </div>
          ) : invalid ? (
            <Card className="border-destructive/30">
              <CardContent className="p-8 text-center">
                <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
                <h1 className="text-xl font-bold">Invite unavailable</h1>
                <p className="mt-2 text-muted-foreground text-sm">{invalid}</p>
                <p className="mt-4 text-sm text-muted-foreground">Please request a new invite link from your administrator.</p>
              </CardContent>
            </Card>
          ) : done ? (
            <Card className="border-primary/20 glow-ring">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="size-12 text-emerald-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold">Registration submitted!</h1>
                <p className="mt-2 text-muted-foreground text-sm">We've sent a verification link to <span className="font-semibold text-foreground">{form.email}</span>. Click it to verify your email, then await administrator approval.</p>
                {devVerifyUrl && (
                  <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm">
                    <p className="font-medium text-amber-700 dark:text-amber-300">Email service not configured</p>
                    <p className="text-muted-foreground mt-1">Verify your email now:</p>
                    <Button asChild className="mt-2" size="sm">
                      <Link href={devVerifyUrl}>Verify my email <ArrowRight className="size-3.5 ml-1" /></Link>
                    </Button>
                  </div>
                )}
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/auth/signin">Back to sign in</Link>
                </Button>
              </CardContent>
            </Card>
          ) : invite ? (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Join the NEXORALABS team</h1>
                <p className="mt-2 text-sm text-muted-foreground">You've been invited by {invite.createdBy}. Complete your registration below.</p>
                <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span>Max uses: {invite.maxUses}</span>
                  <span>·</span>
                  <span>Expires: {new Date(invite.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>
              <Card className="border-border/60 shadow-sm">
                <CardHeader><p className="text-sm text-muted-foreground">Employee registration</p></CardHeader>
                <CardContent>
                  <form onSubmit={submit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="name">Full name *</Label>
                        <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@email.com" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password">Password * <span className="text-muted-foreground font-normal">(min 8 characters)</span></Label>
                      <Input id="password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="title">Job title</Label>
                        <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Software Engineer" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="department">Department</Label>
                        <Input id="department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Engineering" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Optional" />
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11">
                      {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                      {submitting ? 'Registering...' : 'Complete registration'}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">After registration, you'll verify your email and await admin approval before signing in.</p>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
