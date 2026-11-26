'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertTriangle } from 'lucide-react'
import { GuestShell } from '@/components/site/guest-shell'

function Verify() {
  const token = useSearchParams().get('token') || ''
  const ran = useRef(false) // the link works once, so never fire it twice (React strict mode)
  const [state, setState] = useState<'working' | 'error' | 'existing'>('working')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!token) { setState('error'); setMsg('This confirmation link is incomplete.'); return }
    ;(async () => {
      try {
        const r = await fetch('/api/space-join/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
        const d = await r.json().catch(() => ({}))
        if (!r.ok) { setState('error'); setMsg(d.error || 'This confirmation link is invalid or has already been used.'); return }
        if (d.existingAccount) { setState('existing'); setMsg(d.spaceName); return }
        const res = await signIn('guest-link', { token: d.loginToken, redirect: false })
        if (res?.error) { setState('error'); setMsg('You were added, but sign-in failed. Request a sign-in link instead.'); return }
        window.location.href = `/dashboard?space=${d.spaceId}`
      } catch { setState('error'); setMsg('Network error. Please try again.') }
    })()
  }, [token])

  return (
    <GuestShell>
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-8 text-center">
          {state === 'working' && (<><Loader2 className="size-7 animate-spin text-primary mx-auto" /><h1 className="mt-4 text-lg font-bold">Joining the space…</h1></>)}
          {state === 'existing' && (
            <>
              <h1 className="text-lg font-bold">You're in {msg}</h1>
              <p className="mt-2 text-sm text-muted-foreground">You already have a NEXORALABS account. Sign in with it to open the space.</p>
              <Button asChild className="mt-5 h-11 w-full"><Link href="/auth/signin?callbackUrl=/dashboard">Sign in</Link></Button>
            </>
          )}
          {state === 'error' && (
            <>
              <div className="mx-auto size-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3"><AlertTriangle className="size-6 text-destructive" /></div>
              <h1 className="text-lg font-bold">Couldn't confirm</h1>
              <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
              <Button asChild variant="outline" className="mt-5 h-11 w-full"><Link href="/auth/guest-signin">Get a sign-in link</Link></Button>
            </>
          )}
        </CardContent>
      </Card>
    </GuestShell>
  )
}

export default function Page() {
  return <Suspense fallback={null}><Verify /></Suspense>
}
