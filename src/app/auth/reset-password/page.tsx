'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/site/logo'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { PasswordInput } from '@/components/ui/password-input'
import { CheckCircle2, Loader2, Lock, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

function ResetPasswordForm() {
  const params = useSearchParams()
  const token = params.get('token')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ password: '', confirm: '' })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return toast.error('Invalid reset link.')
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters.')
    if (form.password !== form.confirm) return toast.error('Passwords do not match.')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Reset failed.')
        return
      }
      setDone(true)
      toast.success('Password reset! You can now sign in.')
    } catch {
      toast.error('Network error.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">This reset link is missing a token. Please request a new reset link.</p>
          <Button asChild variant="outline" className="mt-4"><Link href="/auth/forgot-password">Request reset link</Link></Button>
        </CardContent>
      </Card>
    )
  }

  if (done) {
    return (
      <Card className="border-primary/20 glow-ring">
        <CardContent className="p-8 text-center">
          <div className="mx-auto size-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="size-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Password reset!</h1>
          <p className="mt-2 text-muted-foreground text-sm">Your password has been updated. You can now sign in with your new password.</p>
          <Button asChild className="mt-6 bg-primary text-primary-foreground font-semibold"><Link href="/auth/signin">Continue to sign in</Link></Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-1 pb-2">
        <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
        <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" required showStrength />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <PasswordInput id="confirm" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="Re-enter your new password" required />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11">
            {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Lock className="size-4 mr-2" />}
            {loading ? 'Resetting...' : 'Reset password'}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/auth/signin" className="font-semibold text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="size-3.5" /> Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/"><Logo /></Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-md">
          <Suspense fallback={<div className="text-center text-muted-foreground"><Loader2 className="size-5 animate-spin mx-auto" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
