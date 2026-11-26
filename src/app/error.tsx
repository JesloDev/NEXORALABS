'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'

// Shown when a page fails on the server (usually a brief database hiccup). Retries once on its own.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const retried = useRef(false)
  useEffect(() => {
    console.error(error)
    if (retried.current) return
    retried.current = true
    const t = setTimeout(reset, 1500)
    return () => clearTimeout(t)
  }, [error, reset])
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-3 p-6 text-center bg-background text-foreground">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground max-w-sm">We hit a temporary problem loading this page. Retrying…</p>
      <Button onClick={reset} className="h-11">Try again</Button>
      {error.digest && <p className="text-[11px] text-muted-foreground">Ref {error.digest}</p>}
    </div>
  )
}
