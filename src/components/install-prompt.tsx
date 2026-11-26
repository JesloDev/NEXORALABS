'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Browsers decide when (and whether) to show their own install dialog, and a site can't force it.
// So we catch the browser's install event, keep it, and show our own banner on every visit until the app is
// installed. Installed copies (standalone window, Android app) never see it.
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const SNOOZE_KEY = 'nx-install-snooze'

function isInstalled() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true || document.referrer.startsWith('android-app://')
  } catch { return false }
}
function snoozed() { try { return sessionStorage.getItem(SNOOZE_KEY) === '1' } catch { return false } }

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null)
  const [ios, setIos] = useState(false)
  const [hidden, setHidden] = useState(true)
  const [help, setHelp] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || isInstalled()) return
    const ua = navigator.userAgent
    const isIos = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
    setIos(isIos)
    setHidden(snoozed())
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); setHidden(snoozed()) }
    const onInstalled = () => { setEvt(null); setHidden(true) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])

  const snooze = () => { try { sessionStorage.setItem(SNOOZE_KEY, '1') } catch {} ; setHidden(true); setHelp(false) }
  const install = async () => {
    if (!evt) return setHelp(true)
    await evt.prompt()
    const { outcome } = await evt.userChoice.catch(() => ({ outcome: 'dismissed' as const }))
    setEvt(null)
    if (outcome === 'dismissed') snooze()
  }

  // Show when the browser can install it (event captured) or on iOS Safari (manual Add to Home Screen).
  if (hidden || (!evt && !ios)) return null

  return (
    <div role="dialog" aria-label="Install NEXORALABS" className="fixed inset-x-3 z-[60] mx-auto max-w-md rounded-2xl border border-border bg-card text-card-foreground shadow-xl p-3.5"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Install the NEXORALABS app</div>
          {help || (ios && !evt) ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              {ios ? <>Tap <Share className="inline size-3.5 -mt-0.5" /> Share, then <b>Add to Home Screen</b> <Plus className="inline size-3.5 -mt-0.5" />.</> : 'Open your browser menu and choose Install app.'}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Faster to open, full screen, works from your home screen.</p>
          )}
          {!(ios && !evt) && !help && (
            <Button size="sm" className="mt-2 h-9 gap-1.5" onClick={install}><Download className="size-4" />Install</Button>
          )}
        </div>
        <button onClick={snooze} aria-label="Not now" className="p-1.5 -m-1 text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
      </div>
    </div>
  )
}
