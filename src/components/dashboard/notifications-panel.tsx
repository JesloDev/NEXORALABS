'use client'

import { useEffect, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, CheckCheck, MessageSquare, ShieldCheck, UserCheck, KeyRound, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const typeIcon: Record<string, any> = {
  LOGIN: KeyRound,
  ACCOUNT_CHANGE: Info,
  NEW_MESSAGE: MessageSquare,
  APPROVAL: UserCheck,
  WAITLIST_CONFIRM: Bell,
  SYSTEM: Info,
}

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifs = async () => {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      if (res.ok) setNotifications(data.notifications)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchNotifs() }, [])

  const markAll = async () => {
    await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAll: true }) })
    fetchNotifs()
  }

  return (
    <div className="flex flex-col h-full">
      <header className="shrink-0 h-16 border-b border-border flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <Bell className="size-5 text-primary" />
          <h1 className="font-semibold">Notifications</h1>
          {notifications.some((n) => !n.read) && <Badge className="bg-primary/10 text-primary border-0">{notifications.filter((n) => !n.read).length} new</Badge>}
        </div>
        {notifications.some((n) => !n.read) && (
          <Button variant="ghost" size="sm" onClick={markAll}><CheckCheck className="size-4 mr-1.5" /> Mark all read</Button>
        )}
      </header>
      <ScrollArea className="flex-1 nexora-scroll">
        <div className="max-w-2xl mx-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center text-muted-foreground py-16">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <Bell className="size-8 mx-auto mb-2 opacity-40" />
              You're all caught up.
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = typeIcon[n.type] || Info
              return (
                <div key={n.id} className={cn('flex gap-3 p-4 rounded-xl border transition-colors', n.read ? 'bg-card border-border' : 'bg-primary/5 border-primary/20')}>
                  <div className={cn('size-9 rounded-lg flex items-center justify-center shrink-0', n.read ? 'bg-muted' : 'bg-primary/10')}>
                    <Icon className={cn('size-4', n.read ? 'text-muted-foreground' : 'text-primary')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{n.title}</span>
                      {!n.read && <span className="size-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                    <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
