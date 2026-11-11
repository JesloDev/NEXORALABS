'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChatMessage } from '@/hooks/use-chat-socket'
import type { DashboardUser } from '@/components/dashboard/dashboard-app'
import { Composer } from './composer'
import { MessageItem } from './message-item'
import type { ChatActions } from './chat-pane'

export function ThreadPanel({
  parent, replies, chat, currentUser, connected, actions, onClose,
}: {
  parent: ChatMessage; replies: ChatMessage[]; chat: any; currentUser: DashboardUser; connected: boolean; actions: ChatActions; onClose: () => void
}) {
  const names = chat.members.map((m: any) => m.name as string)
  const pool = chat.members.filter((m: any) => m.id !== currentUser.id).map((m: any) => ({ id: m.id, name: m.name }))
  const common = { currentUserId: currentUser.id, canModerate: !!chat.canModerate, readOnly: !chat.canSend, names, inThread: true, onReact: actions.react, onEdit: actions.edit, onDelete: actions.remove }
  return (
    <aside className="w-full md:w-[380px] shrink-0 border-l border-border bg-background flex flex-col min-h-0 h-full" aria-label="Thread">
      <header className="h-14 shrink-0 border-b border-border flex items-center px-4">
        <h3 className="font-bold flex-1">Thread</h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close thread"><X className="size-4" /></Button>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto nexora-scroll py-3">
        <MessageItem m={parent} compact={false} mine={parent.senderId === currentUser.id} {...common} />
        <div className="flex items-center gap-3 px-6 my-3"><span className="text-[11px] font-semibold text-muted-foreground">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span><div className="h-px flex-1 bg-border" /></div>
        {replies.map((m, i) => (
          <MessageItem key={m.id} m={m} compact={i > 0 && replies[i - 1].senderId === m.senderId} mine={m.senderId === currentUser.id} {...common} />
        ))}
      </div>
      <div className="p-3 shrink-0">
        {chat.canSend ? (
          <Composer key={parent.id} placeholder={connected ? 'Reply…' : 'Connecting…'} disabled={!connected} pool={pool} onSend={(c) => actions.send(c, parent.id)} />
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">Join this channel to reply.</p>
        )}
      </div>
    </aside>
  )
}
