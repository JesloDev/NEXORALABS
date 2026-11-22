'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// In-app replacements for window.confirm / window.prompt.
// Browser popups look bad on phones and are blocked or ignored inside some installed-app webviews.
type ConfirmOpts = { title: string; message?: string; confirmLabel?: string; destructive?: boolean }
type PromptOpts = { title: string; message?: string; defaultValue?: string; placeholder?: string; confirmLabel?: string }
type Req =
  | ({ kind: 'confirm'; resolve: (v: boolean) => void } & ConfirmOpts)
  | ({ kind: 'prompt'; resolve: (v: string | null) => void } & PromptOpts)

export function useDialogs(): {
  confirm: (o: ConfirmOpts) => Promise<boolean>
  prompt: (o: PromptOpts) => Promise<string | null>
  dialogs: ReactNode
} {
  const [req, setReq] = useState<Req | null>(null)
  const [value, setValue] = useState('')

  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setReq({ kind: 'confirm', resolve, ...o })), [])
  const prompt = useCallback((o: PromptOpts) => new Promise<string | null>((resolve) => { setValue(o.defaultValue ?? ''); setReq({ kind: 'prompt', resolve, ...o }) }), [])

  const finish = (ok: boolean) => {
    if (!req) return
    if (req.kind === 'confirm') req.resolve(ok)
    else req.resolve(ok ? value : null)
    setReq(null)
  }

  const dialogs = (
    <Dialog open={!!req} onOpenChange={(o) => { if (!o) finish(false) }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        {req && (
          <form onSubmit={(e) => { e.preventDefault(); finish(true) }} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{req.title}</DialogTitle>
              {req.message && <DialogDescription>{req.message}</DialogDescription>}
            </DialogHeader>
            {req.kind === 'prompt' && (
              <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={req.placeholder} aria-label={req.title} className="h-11" />
            )}
            <DialogFooter className="flex-row gap-2 sm:justify-end">
              <Button type="button" variant="outline" className="flex-1 sm:flex-none h-11 sm:h-9" onClick={() => finish(false)}>Cancel</Button>
              <Button type="submit"
                className={cn('flex-1 sm:flex-none h-11 sm:h-9', req.kind === 'confirm' && req.destructive && 'bg-destructive text-white hover:bg-destructive/90')}>
                {req.confirmLabel ?? (req.kind === 'confirm' && req.destructive ? 'Delete' : 'OK')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )

  return { confirm, prompt, dialogs }
}
