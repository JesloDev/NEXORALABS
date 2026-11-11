'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { initials } from './types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export interface MentionTarget { id: string; name: string }

// Multi-line composer: Enter sends, Shift+Enter = newline, "@" opens a mention picker.
export function Composer({
  placeholder, disabled, onSend, onTyping, pool = [], autoFocus,
}: {
  placeholder: string
  disabled?: boolean
  onSend: (content: string) => Promise<boolean> | boolean
  onTyping?: (typing: boolean) => void
  pool?: MentionTarget[]
  autoFocus?: boolean
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [pick, setPick] = useState(0)
  const ref = useRef<HTMLTextAreaElement>(null)

  const mention = /(^|\s)@([\w .'-]{0,30})$/.exec(text)
  const options = mention
    ? [{ id: '__channel', name: 'channel' }, ...pool].filter((p) => p.name.toLowerCase().includes(mention[2].toLowerCase())).slice(0, 6)
    : []

  const insert = (name: string) => {
    if (!mention) return
    setText(text.slice(0, mention.index + mention[1].length) + `@${name} `)
    setPick(0)
    ref.current?.focus()
  }

  const submit = async () => {
    const content = text.trim()
    if (!content || busy || disabled) return
    setBusy(true)
    onTyping?.(false)
    const ok = await onSend(content)
    setBusy(false)
    if (ok) setText('')
    ref.current?.focus()
  }

  const resize = (el: HTMLTextAreaElement) => { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px' }

  return (
    <div className="relative">
      {options.length > 0 && (
        <div role="listbox" aria-label="Mention suggestions" className="absolute bottom-full mb-2 left-0 w-64 rounded-lg border border-border bg-popover shadow-lg py-1 z-20">
          {options.map((o, i) => (
            <button key={o.id} role="option" aria-selected={i === pick} type="button" onMouseDown={(e) => { e.preventDefault(); insert(o.name) }}
              className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left', i === pick ? 'bg-accent' : 'hover:bg-muted')}>
              <Avatar className="size-5"><AvatarFallback className="text-[9px]">{o.id === '__channel' ? '#' : initials(o.name)}</AvatarFallback></Avatar>
              {o.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 rounded-xl border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
        <textarea
          ref={ref}
          autoFocus={autoFocus}
          rows={1}
          value={text}
          disabled={disabled}
          aria-label="Message"
          onChange={(e) => { setText(e.target.value); setPick(0); resize(e.target); onTyping?.(e.target.value.length > 0) }}
          onKeyDown={(e) => {
            if (options.length) {
              if (e.key === 'ArrowDown') { e.preventDefault(); return setPick((p) => (p + 1) % options.length) }
              if (e.key === 'ArrowUp') { e.preventDefault(); return setPick((p) => (p - 1 + options.length) % options.length) }
              if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); return insert(options[pick].name) }
              if (e.key === 'Escape') { e.preventDefault(); return setText(text.replace(/@[\w .'-]{0,30}$/, '')) }
            }
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() }
          }}
          placeholder={placeholder}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-40 py-1"
        />
        <Button size="icon" onClick={submit} disabled={disabled || busy || !text.trim()} className="size-8 shrink-0 rounded-lg" aria-label="Send message">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
      <p className="mt-1 px-1 text-[11px] text-muted-foreground hidden sm:block">Enter to send · Shift+Enter for a new line · @ to mention</p>
    </div>
  )
}
