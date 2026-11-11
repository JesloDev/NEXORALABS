'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Smile, MessageSquareReply, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { initials } from './types'
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

export function MessageItem({
  m, compact, mine, currentUserId, canModerate, readOnly, names, inThread,
  onReact, onReply, onEdit, onDelete,
}: {
  m: ChatMessage
  compact: boolean // same sender as previous message → hide avatar/name
  mine: boolean
  currentUserId: string
  canModerate: boolean
  readOnly: boolean
  names: string[]
  inThread?: boolean
  onReact: (id: string, emoji: string) => void
  onReply?: (m: ChatMessage) => void
  onEdit: (id: string, content: string) => Promise<boolean>
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(m.content)
  const [emojiOpen, setEmojiOpen] = useState(false)

  const grouped = new Map<string, string[]>()
  m.reactions?.forEach((r) => grouped.set(r.emoji, [...(grouped.get(r.emoji) || []), r.userId]))

  return (
    <div className={cn('group relative flex gap-3 px-4 sm:px-6 py-0.5 hover:bg-muted/50 focus-within:bg-muted/50', !compact && 'mt-3')}>
      <div className="w-9 shrink-0">
        {!compact ? (
          <Avatar className="size-9 mt-0.5">
            <AvatarImage src={m.sender.image || undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials(m.sender.name)}</AvatarFallback>
          </Avatar>
        ) : (
          <span className="hidden group-hover:block text-[10px] text-muted-foreground pt-1.5 text-right">{formatTime(m.createdAt)}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!compact && (
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm">{m.sender.name}</span>
            <span className="text-[11px] text-muted-foreground">{formatTime(m.createdAt)}</span>
          </div>
        )}

        {editing ? (
          <div className="mt-1">
            <textarea
              autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Edit message"
              onKeyDown={async (e) => {
                if (e.key === 'Escape') { setEditing(false); setDraft(m.content) }
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (draft.trim() && (await onEdit(m.id, draft.trim()))) setEditing(false) }
              }}
              rows={Math.min(6, draft.split('\n').length + 1)}
              className="w-full rounded-lg border border-input bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Enter to save · Esc to cancel</p>
          </div>
        ) : (
          <div className="text-sm leading-relaxed break-words [&_p]:my-0 [&_p+p]:mt-2 [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_pre]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground">
            <ReactMarkdown components={{ a: ({ node, ...p }) => <a {...p} target="_blank" rel="noopener noreferrer nofollow" /> }}>
              {renderContent(m.content, names)}
            </ReactMarkdown>
            {m.editedAt && <span className="text-[11px] text-muted-foreground"> (edited)</span>}
          </div>
        )}

        {grouped.size > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {[...grouped.entries()].map(([emoji, users]) => (
              <ReactionChip key={emoji} emoji={emoji} count={users.length} onClick={() => onReact(m.id, emoji)} disabled={readOnly} reacted={users.includes(currentUserId)} />
            ))}
          </div>
        )}

        {!inThread && m.replyCount > 0 && (
          <button onClick={() => onReply?.(m)} className="mt-1 text-xs font-medium text-primary hover:underline">
            {m.replyCount} {m.replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {!editing && (
        <div className="absolute -top-3 right-4 hidden group-hover:flex group-focus-within:flex items-center rounded-lg border border-border bg-background shadow-sm">
          {!readOnly && (
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <button className="p-1.5 hover:bg-muted rounded-l-lg" aria-label="Add reaction"><Smile className="size-4" /></button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1 flex gap-0.5" align="end">
                {QUICK.map((e) => (
                  <button key={e} onClick={() => { onReact(m.id, e); setEmojiOpen(false) }} className="p-1.5 text-lg hover:bg-muted rounded" aria-label={`React ${e}`}>{e}</button>
                ))}
              </PopoverContent>
            </Popover>
          )}
          {!inThread && onReply && (
            <button onClick={() => onReply(m)} className="p-1.5 hover:bg-muted" aria-label="Reply in thread"><MessageSquareReply className="size-4" /></button>
          )}
          {mine && !readOnly && (
            <button onClick={() => { setDraft(m.content); setEditing(true) }} className="p-1.5 hover:bg-muted" aria-label="Edit message"><Pencil className="size-4" /></button>
          )}
          {(mine || canModerate) && (
            <button onClick={() => { if (confirm('Delete this message?')) onDelete(m.id) }} className="p-1.5 hover:bg-destructive/10 text-destructive rounded-r-lg" aria-label="Delete message"><Trash2 className="size-4" /></button>
          )}
        </div>
      )}
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
