'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/site/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ArrowRight, Loader2, MailCheck, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [devUrl, setDevUrl] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return toast.error('Enter your email address.')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Something went wrong.')
        return
      }
      setDone(true)
      if (data.devResetUrl) setDevUrl(data.devResetUrl)
      toast.success('If an account exists, a reset link has been sent.')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/"><Logo /></Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-md">
          {done ? (
            <Card className="border-primary/20 glow-ring">
              <CardContent className="p-8 text-center">
                <div className="mx-auto size-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <MailCheck className="size-7 text-primary" />
                </div>
                <h1 className="text-xl font-bold">Check your inbox</h1>
                <p className="mt-2 text-muted-foreground text-sm">
                  If an account exists for <span className="font-semibold text-foreground">{email}</span>, we've sent a password reset link. The link expires in 30 minutes.
                </p>
                {devUrl && (
                  <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-left">
                    <p className="font-medium text-amber-700 dark:text-amber-300 text-xs">Email service not configured — reset link:</p>
                    <a href={devUrl} className="break-all text-primary underline text-xs mt-1 block">{devUrl}</a>
                  </div>
                )}
                <Button asChild variant="outline" className="mt-6">
                  <Link href="/auth/signin"><ArrowLeft className="size-4 mr-1.5" /> Back to sign in</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="space-y-1 pb-2">
                <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
                <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@nexoralabs.com" required />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11">
                    {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    {loading ? 'Sending...' : 'Send reset link'}
                    {!loading && <ArrowRight className="size-4 ml-2" />}
                  </Button>
                </form>
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Remembered it?{' '}
                  <Link href="/auth/signin" className="font-semibold text-primary hover:underline">Sign in</Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
