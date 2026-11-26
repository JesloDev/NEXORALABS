'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertTriangle } from 'lucide-react'
import { GuestShell } from '@/components/site/guest-shell'

function Go() {
  const token = useSearchParams().get('token') || ''
  const ran = useRef(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    ;(async () => {
      const res = token ? await signIn('guest-link', { token, redirect: false }) : { error: 'x' }
      if (res?.error) setFailed(true); else window.location.href = '/dashboard'
    })()
  }, [token])

  return (
    <GuestShell>
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-8 text-center">
          {!failed ? (<><Loader2 className="size-7 animate-spin text-primary mx-auto" /><h1 className="mt-4 text-lg font-bold">Signing you in…</h1></>) : (
            <>
              <div className="mx-auto size-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3"><AlertTriangle className="size-6 text-destructive" /></div>
              <h1 className="text-lg font-bold">This link no longer works</h1>
              <p className="mt-2 text-sm text-muted-foreground">Sign-in links work once and expire after 15 minutes.</p>
              <Button asChild className="mt-5 h-11 w-full"><Link href="/auth/guest-signin">Get a new link</Link></Button>
            </>
          )}
        </CardContent>
      </Card>
    </GuestShell>
  )
}

export default function Page() {
  return <Suspense fallback={null}><Go /></Suspense>
}
