'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/site/logo'
import { WaitlistForm } from '@/components/site/waitlist-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

function VerifyState() {
  const params = useSearchParams()
  const token = params.get('verify')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/waitlist/verify?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (cancelled) return
        if (res.ok && data.ok) {
          setStatus('success')
          setMsg(data.alreadyConfirmed ? "You're already confirmed and on the waitlist!" : 'Your email is confirmed. Welcome to the waitlist!')
        } else {
          setStatus('error')
          setMsg(data.error || 'Verification failed.')
        }
      } catch {
        setStatus('error')
        setMsg('Network error during verification.')
      }
    })()
    return () => { cancelled = true }
  }, [token])

  if (!token) return null

  return (
    <Card className="mb-8 border-primary/20">
      <CardContent className="p-6 flex items-start gap-4">
        {status === 'loading' && <Loader2 className="size-5 animate-spin text-primary mt-0.5" />}
        {status === 'success' && <CheckCircle2 className="size-5 text-emerald-500 mt-0.5" />}
        {status === 'error' && <XCircle className="size-5 text-destructive mt-0.5" />}
        <div>
          <p className="font-semibold">{status === 'loading' ? 'Verifying your email...' : msg}</p>
          {status === 'success' && <p className="text-sm text-muted-foreground mt-1">We've sent a confirmation to your inbox. Our team will reach out as we onboard new members.</p>}
          {status === 'error' && <p className="text-sm text-muted-foreground mt-1">Please re-submit the waitlist form to receive a new link.</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export default function WaitlistPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/auth/signin">Sign in</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <Suspense fallback={null}>
            <VerifyState />
          </Suspense>
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Join the NEXORALABS waitlist</h1>
            <p className="mt-3 text-muted-foreground">Be first to access our innovation programs and partnerships.</p>
          </div>
          <WaitlistForm />
        </div>
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} NEXORALABS · Waitlist members are not given internal accounts.
      </footer>
    </div>
  )
}
