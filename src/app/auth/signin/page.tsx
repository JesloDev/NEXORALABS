'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Logo } from '@/components/site/logo'
import { ArrowRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

function SignInForm() {
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/dashboard'
  const error = params.get('error')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  if (error) {
    const messages: Record<string, string> = {
      CredentialsSignin: 'Invalid email or password.',
      AccessDenied: 'Your account is not yet active. Please complete verification and await admin approval.',
    }
    // show once
    setTimeout(() => toast.error(messages[error] || 'Sign in failed.'), 100)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        callbackUrl,
      })
      if (res?.error) {
        // NextAuth returns 'CredentialsSignin' for any authorize() failure.
        // The specific thrown Error message isn't surfaced via redirect:false,
        // so we show a clear, actionable message.
        toast.error('Unable to sign in. Check your credentials, or your account may be pending approval/suspended.')
        return
      }
      if (res?.ok) {
        toast.success('Welcome back!')
        const dest = callbackUrl.startsWith('/') ? callbackUrl : '/dashboard'
        window.location.href = dest
        return
      }
      toast.error('Sign in failed. The server may be misconfigured — check that NEXTAUTH_SECRET and DATABASE_URL are set.')
    } catch (err: any) {
      // signIn() throws when the response can't be parsed as JSON (e.g. a 500
      // with an empty body). Surface a clear, actionable message.
      console.error('Sign in error:', err)
      toast.error('Sign in failed — the server returned an error. This is usually caused by a missing NEXTAUTH_SECRET or DATABASE_URL environment variable. Contact your administrator.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 grid lg:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-muted/30 border-r border-border">
          <div className="absolute inset-0 hero-grid opacity-40" aria-hidden />
          <Link href="/" className="relative"><Logo size={36} /></Link>
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight leading-tight">
              The internal circle for <span className="brand-gradient-text">NEXORALABS</span> teams.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed max-w-md">
              Secure, invite-only collaboration hardened for the teams turning ideas into sustainable, SDG-aligned solutions.
            </p>
            <div className="mt-8 space-y-3">
              {[
                { icon: ShieldCheck, t: 'Hardened backend, membership-scoped conversations' },
                { icon: Sparkles, t: 'Invite-based onboarding with admin approval' },
              ].map((f) => (
                <div key={f.t} className="flex items-center gap-3 text-sm">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <f.icon className="size-4 text-primary" />
                  </div>
                  <span className="text-foreground/80">{f.t}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="relative text-xs text-muted-foreground">© {new Date().getFullYear()} NEXORALABS</p>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-sm">
            <div className="lg:hidden mb-8">
              <Link href="/"><Logo /></Link>
            </div>
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="space-y-1 pb-2">
                <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
                <p className="text-sm text-muted-foreground">Access the NEXORALABS internal circle.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@nexoralabs.com" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11">
                    {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link href="/waitlist" className="font-semibold text-primary hover:underline inline-flex items-center gap-1">
                    Join/Register on the waitlist <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Access is invite-based and admin-approved. Contact your administrator if you need an invite link.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Default export must wrap the useSearchParams consumer in <Suspense>
// so Next.js can statically prerender this route without build errors.
export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
