'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/site/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Loader2, XCircle, Clock } from 'lucide-react'

function VerifyContent() {
  const params = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'error'>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (cancelled) return
        if (res.ok && data.ok) {
          setStatus(data.alreadyVerified ? 'already' : 'success')
          setMsg(data.alreadyVerified ? 'Your email is already verified.' : 'Email verified successfully!')
        } else {
          setStatus('error')
          setMsg(data.error || 'Verification failed.')
        }
      } catch {
        setStatus('error')
        setMsg('Network error.')
      }
    })()
    return () => { cancelled = true }
  }, [token])

  return (
    <Card className="border-primary/20 glow-ring">
      <CardContent className="p-8 text-center">
        {status === 'loading' && <Loader2 className="size-12 animate-spin text-primary mx-auto mb-4" />}
        {status === 'success' && <CheckCircle2 className="size-12 text-emerald-500 mx-auto mb-4" />}
        {status === 'already' && <CheckCircle2 className="size-12 text-emerald-500 mx-auto mb-4" />}
        {status === 'error' && <XCircle className="size-12 text-destructive mx-auto mb-4" />}
        <h1 className="text-xl font-bold">{msg}</h1>
        {status === 'success' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4 text-primary" />
              Your registration is now awaiting administrator approval.
            </div>
            <p className="text-sm text-muted-foreground">Once approved, you'll receive an email and can sign in to the internal circle.</p>
            <Button asChild className="bg-primary text-primary-foreground font-semibold rounded-full mt-2">
              <Link href="/auth/signin">Continue to sign in</Link>
            </Button>
          </div>
        )}
        {status === 'already' && (
          <Button asChild className="bg-primary text-primary-foreground font-semibold rounded-full mt-4">
            <Link href="/auth/signin">Continue to sign in</Link>
          </Button>
        )}
        {status === 'error' && (
          <p className="mt-3 text-sm text-muted-foreground">Please re-register using your invite link to receive a new verification email.</p>
        )}
      </CardContent>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/"><Logo /></Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
            <VerifyContent />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
