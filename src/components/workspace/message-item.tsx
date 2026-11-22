'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Smile, MessageSquareReply, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { initials } from './types'
import { useDialogs } from '@/components/dashboard/use-dialogs'
import type { ChatMessage } from '@/hooks/use-chat-socket'

const QUICK = ['👍', '❤️', '😂', '🎉', '👀', '✅']

export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function renderContent(content: string, names: string[]) {
  // highlight @mentions of known people (+ @channel) in bold; everything else is plain markdown (no raw HTML)
  let out = content
  for (const n of [...names].sort((a, b) => b.length - a.length)) {
    out = out.split(`@${n}`).join(`**@${n}**`)
  }
  return out.replace(/@(channel|here)\b/gi, '**@$1**')
}

// One chat bubble. Own messages: right, brand colour. Others: left, card colour, with avatar + name on the first bubble of a run.
export function MessageItem({
  m, compact, mine, currentUserId, canModerate, readOnly, names, inThread, showSender = true,
  onReact, onReply, onEdit, onDelete,
}: {
  m: ChatMessage
  compact: boolean // same sender as previous message → no avatar/name, tighter spacing
  mine: boolean
  currentUserId: string
  canModerate: boolean
  readOnly: boolean
  names: string[]
  inThread?: boolean
  showSender?: boolean // show the sender's name above their first bubble (hidden in 1:1 chats)
  onReact: (id: string, emoji: string) => void
  onReply?: (m: ChatMessage) => void
  onEdit: (id: string, content: string) => Promise<boolean>
  onDelete: (id: string) => void
}) {
  const { confirm, dialogs } = useDialogs()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(m.content)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false) // tap a bubble to show its actions on touch screens

  const grouped = new Map<string, string[]>()
  m.reactions?.forEach((r) => grouped.set(r.emoji, [...(grouped.get(r.emoji) || []), r.userId]))

  const canReact = !readOnly
  const canReply = !inThread && !!onReply
  const canEdit = mine && !readOnly
  const canDelete = mine || canModerate
  const hasActions = canReact || canReply || canEdit || canDelete

  const toggleActions = (e: React.MouseEvent) => {
    // taps on links, buttons or text selection shouldn't toggle the toolbar
    if ((e.target as HTMLElement).closest('a,button,textarea')) return
    if (window.getSelection()?.toString()) return
    if (hasActions) setActionsOpen((o) => !o)
  }

  const remove = async () => {
    setActionsOpen(false)
    if (await confirm({ title: 'Delete this message?', message: 'This cannot be undone.', destructive: true })) onDelete(m.id)
  }

  return (
    <div className={cn('group relative flex gap-2 px-3 sm:px-5', mine && 'flex-row-reverse', compact ? 'mt-0.5' : 'mt-3')}>
      {dialogs}
      {!mine && (
        <div className="w-8 shrink-0">
          {!compact && (
            <Avatar className="size-8 mt-0.5">
              <AvatarImage src={m.sender.image || undefined} />
              <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">{initials(m.sender.name)}</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={cn('min-w-0 flex flex-col', editing ? 'w-full' : 'max-w-[85%] sm:max-w-[70%]', mine ? 'items-end' : 'items-start')}>
        {!mine && !compact && showSender && (
          <span className="mb-0.5 ml-1 text-xs font-semibold text-foreground/80">{m.sender.name}</span>
        )}

        <div className="relative max-w-full">
          <div
            onClick={toggleActions}
            className={cn(
              'rounded-2xl px-3 py-2 text-sm leading-relaxed break-words shadow-sm',
              mine
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-card-foreground border border-border',
              // the corner next to the avatar is squarer on the first bubble of a run, like a speech-bubble tail
              !compact && (mine ? 'rounded-tr-md' : 'rounded-tl-md'),
              hasActions && 'cursor-pointer',
              actionsOpen && 'ring-2 ring-ring/40',
            )}
          >
            {editing ? (
              <div className="min-w-[14rem]">
                <textarea
                  autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Edit message"
                  onKeyDown={async (e) => {
                    if (e.key === 'Escape') { setEditing(false); setDraft(m.content) }
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (draft.trim() && (await onEdit(m.id, draft.trim()))) setEditing(false) }
                  }}
                  rows={Math.min(6, draft.split('\n').length + 1)}
                  className="w-full rounded-lg border border-input bg-background text-foreground p-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <div className="mt-1.5 flex items-center gap-2">
                  <button className="rounded-md bg-background text-foreground px-3 h-8 text-xs font-medium"
                    onClick={async () => { if (draft.trim() && (await onEdit(m.id, draft.trim()))) setEditing(false) }}>Save</button>
                  <button className="rounded-md px-3 h-8 text-xs font-medium underline" onClick={() => { setEditing(false); setDraft(m.content) }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className={cn(
                  '[&_p]:my-0 [&_p+p]:mt-2 [&_a]:underline [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_pre]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:pl-3',
                  mine
                    ? '[&_a]:text-inherit [&_code]:bg-black/20 [&_pre]:bg-black/20 [&_blockquote]:border-primary-foreground/40 [&_blockquote]:text-primary-foreground/80'
                    : '[&_a]:text-primary [&_code]:bg-muted [&_pre]:bg-muted [&_blockquote]:text-muted-foreground',
                )}>
                  <ReactMarkdown components={{ a: ({ node, ...p }) => <a {...p} target="_blank" rel="noopener noreferrer nofollow" /> }}>
                    {renderContent(m.content, names)}
                  </ReactMarkdown>
                </div>
                <div className={cn('mt-0.5 flex items-center justify-end gap-1 text-[10px] leading-none select-none', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {m.editedAt && <span>edited</span>}
                  <span>{formatTime(m.createdAt)}</span>
                </div>
              </>
            )}
          </div>

          {!editing && hasActions && (
            <div className={cn(
              'absolute -top-4 z-10 items-center rounded-lg border border-border bg-background text-foreground shadow-md',
              mine ? 'left-0 -translate-x-1' : 'right-0 translate-x-1',
              actionsOpen ? 'flex' : 'hidden md:group-hover:flex md:group-focus-within:flex',
            )}>
              {canReact && (
                <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                  <PopoverTrigger asChild>
                    <button className="size-9 md:size-8 flex items-center justify-center hover:bg-muted rounded-l-lg" aria-label="Add reaction"><Smile className="size-4" /></button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-1 flex gap-0.5" align={mine ? 'start' : 'end'}>
                    {QUICK.map((e) => (
                      <button key={e} onClick={() => { onReact(m.id, e); setEmojiOpen(false); setActionsOpen(false) }} className="size-10 md:size-9 text-lg hover:bg-muted rounded" aria-label={`React ${e}`}>{e}</button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
              {canReply && (
                <button onClick={() => { setActionsOpen(false); onReply!(m) }} className="size-9 md:size-8 flex items-center justify-center hover:bg-muted" aria-label="Reply in thread"><MessageSquareReply className="size-4" /></button>
              )}
              {canEdit && (
                <button onClick={() => { setActionsOpen(false); setDraft(m.content); setEditing(true) }} className="size-9 md:size-8 flex items-center justify-center hover:bg-muted" aria-label="Edit message"><Pencil className="size-4" /></button>
              )}
              {canDelete && (
                <button onClick={remove} className="size-9 md:size-8 flex items-center justify-center hover:bg-destructive/10 text-destructive rounded-r-lg" aria-label="Delete message"><Trash2 className="size-4" /></button>
              )}
            </div>
          )}
        </div>

        {grouped.size > 0 && (
          <div className={cn('flex flex-wrap gap-1 mt-1', mine && 'justify-end')}>
            {[...grouped.entries()].map(([emoji, users]) => (
              <ReactionChip key={emoji} emoji={emoji} count={users.length} onClick={() => onReact(m.id, emoji)} disabled={readOnly} reacted={users.includes(currentUserId)} />
            ))}
          </div>
        )}

        {!inThread && m.replyCount > 0 && (
          <button onClick={() => onReply?.(m)} className="mt-1 px-1 text-xs font-medium text-primary hover:underline">
            {m.replyCount} {m.replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>
    </div>
  )
}

function ReactionChip({ emoji, count, onClick, disabled, reacted }: { emoji: string; count: number; onClick: () => void; disabled: boolean; reacted: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={`${emoji} ${count}`}
      className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition', reacted ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-muted')}>
      <span>{emoji}</span><span className="font-medium">{count}</span>
    </button>
  )
}
