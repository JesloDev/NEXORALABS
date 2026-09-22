'use client'

import { useEffect, useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  Users as UsersIcon, UserCheck, Link2, Megaphone, Activity, ClipboardList, ShieldCheck,
  Copy, Check, Plus, Trash2, Ban, CheckCircle2, XCircle, Crown, Loader2, ExternalLink, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { DashboardUser } from './dashboard-app'

function initials(name: string) {
  return name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export function AdminConsole({ user }: { user: DashboardUser }) {
  const isSuper = user.role === 'SUPER_ADMIN'
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 border-b border-border bg-background">
          <div className="px-5 sm:px-6 pt-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Admin Console</h1>
              <p className="text-xs text-muted-foreground">Manage your team, invites, content and platform activity.</p>
            </div>
          </div>
          <div className="px-5 sm:px-6 py-3">
            <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
              <TabsTrigger value="overview" className="gap-1.5"><Activity className="size-3.5" /> Overview</TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5"><UsersIcon className="size-3.5" /> Users</TabsTrigger>
              <TabsTrigger value="approvals" className="gap-1.5"><UserCheck className="size-3.5" /> Approvals</TabsTrigger>
              <TabsTrigger value="invites" className="gap-1.5"><Link2 className="size-3.5" /> Invite Links</TabsTrigger>
              <TabsTrigger value="announcements" className="gap-1.5"><Megaphone className="size-3.5" /> News</TabsTrigger>
              <TabsTrigger value="waitlist" className="gap-1.5"><ClipboardList className="size-3.5" /> Waitlist</TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5"><Activity className="size-3.5" /> Activity</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <ScrollArea className="flex-1 nexora-scroll">
          <div className="p-5 sm:p-6 pb-16 max-w-6xl mx-auto w-full">
            <TabsContent value="overview" className="mt-0"><OverviewTab /></TabsContent>
            <TabsContent value="users" className="mt-0"><UsersTab currentUserId={user.id} currentRole={user.role} /></TabsContent>
            <TabsContent value="approvals" className="mt-0"><ApprovalsTab /></TabsContent>
            <TabsContent value="invites" className="mt-0"><InvitesTab /></TabsContent>
            <TabsContent value="announcements" className="mt-0"><AnnouncementsTab /></TabsContent>
            <TabsContent value="waitlist" className="mt-0"><WaitlistTab /></TabsContent>
            <TabsContent value="activity" className="mt-0"><ActivityTab /></TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  )
}

// ── Overview ──
function OverviewTab() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => { if (d.stats) setStats(d.stats) }).finally(() => setLoading(false))
  }, [])
  if (loading || !stats) return <CenterSpinner />
  const cards = [
    { label: 'Total users', value: stats.users, icon: UsersIcon, color: 'text-primary' },
    { label: 'Active', value: stats.activeUsers, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Suspended', value: stats.suspendedUsers, icon: Ban, color: 'text-amber-500' },
    { label: 'Pending approval', value: stats.pendingApprovals, icon: UserCheck, color: 'text-sky-500' },
    { label: 'Groups', value: stats.groups, icon: UsersIcon, color: 'text-fuchsia-500' },
    { label: 'Direct chats', value: stats.directChats, icon: Link2, color: 'text-teal-500' },
    { label: 'Messages', value: stats.messages, icon: Activity, color: 'text-indigo-500' },
    { label: 'Announcements', value: stats.announcements, icon: Megaphone, color: 'text-rose-500' },
    { label: 'Waitlist', value: stats.waitlist, icon: ClipboardList, color: 'text-lime-600' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="border-border/60">
          <CardContent className="p-4">
            <c.icon className={cn('size-5 mb-2', c.color)} />
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Users ──
function UsersTab({ currentUserId, currentRole }: { currentUserId: string; currentRole: string }) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    if (res.ok) setUsers(data.users)
    setLoading(false)
  }, [])
  useEffect(() => { fetchUsers() }, [fetchUsers])

  const filtered = users.filter(u => !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))

  const updateRole = async (userId: string, role: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error)
    toast.success('Role updated.')
    fetchUsers()
  }
  const toggleSuspend = async (userId: string, suspend: boolean) => {
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suspend }) })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error)
    toast.success(suspend ? 'User suspended.' : 'User reactivated.')
    fetchUsers()
  }
  const deleteUser = async (userId: string) => {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error)
    toast.success('User deleted.')
    fetchUsers()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold">Team members ({users.length})</h3>
        <div className="relative w-full sm:w-72">
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search users..." className="pl-3" />
        </div>
      </div>
      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? <CenterSpinner /> : (
            <div className="divide-y divide-border">
              {filtered.map((u) => {
                const isSelf = u.id === currentUserId
                const isSuper = u.role === 'SUPER_ADMIN'
                return (
                  <div key={u.id} className="flex items-center gap-3 p-3 sm:p-4">
                    <Avatar className="size-9"><AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(u.name)}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{u.name}{isSelf && ' (you)'}</span>
                        {isSuper && <Crown className="size-3 text-amber-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}{u.title ? ` · ${u.title}` : ''}</div>
                    </div>
                    <Badge variant={u.status === 'ACTIVE' ? 'default' : 'secondary'} className={cn('text-[10px]', u.status === 'SUSPENDED' && 'bg-amber-500/10 text-amber-600 border-0', u.status === 'PENDING' && 'bg-sky-500/10 text-sky-600 border-0')}>{u.status}</Badge>
                    {!isSelf && !isSuper && currentRole !== 'EMPLOYEE' && (
                      <div className="flex items-center gap-1">
                        <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} disabled={currentRole === 'ADMIN'} className="text-xs rounded-md border border-input bg-background px-2 py-1 h-8">
                          <option value="EMPLOYEE">Team</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <Button size="icon" variant="ghost" className="size-8" onClick={() => toggleSuspend(u.id, u.status !== 'SUSPENDED')} title={u.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}>
                          {u.status === 'SUSPENDED' ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Ban className="size-4 text-amber-500" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8 hover:text-destructive" onClick={() => deleteUser(u.id)} title="Delete">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Approvals ──
function ApprovalsTab() {
  const [data, setData] = useState<{ pending: any[]; incomplete: any[] }>({ pending: [], incomplete: [] })
  const [loading, setLoading] = useState(true)
  const fetch_ = async () => {
    const res = await fetch('/api/admin/approvals')
    const d = await res.json()
    if (res.ok) setData({ pending: d.pending, incomplete: d.incomplete })
    setLoading(false)
  }
  useEffect(() => { fetch_() }, [])
  const approve = async (id: string) => {
    const res = await fetch(`/api/admin/approvals/${id}/approve`, { method: 'POST' })
    if (!res.ok) { const d = await res.json(); return toast.error(d.error) }
    toast.success('User approved & notified.')
    fetch_()
  }
  const reject = async (id: string) => {
    const reason = prompt('Reason for rejection (optional):') || ''
    const res = await fetch(`/api/admin/approvals/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
    if (!res.ok) { const d = await res.json(); return toast.error(d.error) }
    toast.success('Registration rejected. Email freed for re-registration.')
    fetch_()
  }
  const clearIncomplete = async (id: string) => {
    if (!confirm('Remove this incomplete registration?')) return
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Removed.'); fetch_() }
  }
  if (loading) return <CenterSpinner />
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Pending approval ({data.pending.length})</h3>
        {data.pending.length === 0 ? (
          <EmptyCard text="No pending approvals." />
        ) : (
          <div className="space-y-2">
            {data.pending.map((u) => (
              <Card key={u.id} className="border-border/60">
                <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                  <Avatar className="size-10"><AvatarFallback className="bg-sky-500/10 text-sky-600">{initials(u.name)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email} · {u.title || 'No title'} · verified {new Date(u.emailVerified).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approve(u.id)} className="bg-primary text-primary-foreground"><CheckCircle2 className="size-4 mr-1" /> Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => reject(u.id)} className="text-destructive hover:text-destructive"><XCircle className="size-4 mr-1" /> Reject</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {data.incomplete.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Incomplete registrations ({data.incomplete.length})</h3>
          <Card className="border-border/60">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {data.incomplete.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email} — email not verified</div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => clearIncomplete(u.id)}><Trash2 className="size-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ── Invites ──
function InvitesTab() {
  const [invites, setInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [maxUses, setMaxUses] = useState(1)
  const [days, setDays] = useState(7)
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const fetch_ = async () => {
    const res = await fetch('/api/admin/invites')
    const d = await res.json()
    if (res.ok) setInvites(d.invites)
    setLoading(false)
  }
  useEffect(() => { fetch_() }, [])
  const create = async () => {
    setCreating(true)
    const res = await fetch('/api/admin/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maxUses: Number(maxUses), expiresInDays: Number(days), label }) })
    const d = await res.json()
    if (!res.ok) return toast.error(d.error)
    toast.success('Invite link created.')
    setLabel('')
    fetch_()
    setCreating(false)
  }
  const revoke = async (id: string) => {
    if (!confirm('Revoke this invite link?')) return
    await fetch(`/api/admin/invites/${id}`, { method: 'DELETE' })
    toast.success('Invite revoked.')
    fetch_()
  }
  const copy = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    toast.success('Invite link copied!')
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-base">Generate a new invite link</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Max uses</Label>
              <Input type="number" min={1} max={1000} value={maxUses} onChange={e => setMaxUses(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Expires in (days)</Label>
              <Input type="number" min={1} max={365} value={days} onChange={e => setDays(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Label (optional)</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Engineering hire" />
            </div>
          </div>
          <Button onClick={create} disabled={creating} className="bg-primary text-primary-foreground"><Plus className="size-4 mr-1.5" /> {creating ? 'Creating...' : 'Create invite link'}</Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-semibold mb-3">Active & past invite links ({invites.length})</h3>
        {loading ? <CenterSpinner /> : invites.length === 0 ? <EmptyCard text="No invite links yet." /> : (
          <div className="space-y-2">
            {invites.map((i) => (
              <Card key={i.id} className={cn('border-border/60', !i.valid && 'opacity-60')}>
                <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                  <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Link2 className="size-4 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{i.label || 'Invite link'}</span>
                      {i.valid
                        ? <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">Active</Badge>
                        : <Badge variant="secondary" className="text-[10px]">{i.expiredByDate ? 'Expired' : i.exhausted ? 'Used up' : 'Revoked'}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {i.currentUses}/{i.maxUses} used · expires {new Date(i.expiresAt).toLocaleDateString()} · by {i.createdBy?.name}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => copy(i.token)}>
                      {copied === i.token ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                    </Button>
                    {i.valid && (
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => revoke(i.id)} title="Revoke"><Ban className="size-4" /></Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Announcements ──
function AnnouncementsTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState({ title: '', summary: '', content: '', category: 'NEWS', published: true, pinned: false })

  const fetch_ = async () => {
    const res = await fetch('/api/admin/announcements')
    const d = await res.json()
    if (res.ok) setItems(d.announcements)
    setLoading(false)
  }
  useEffect(() => { fetch_() }, [])
  const save = async () => {
    if (!form.title || !form.summary || !form.content) return toast.error('Fill all fields.')
    const method = editing ? 'PATCH' : 'POST'
    const url = editing ? `/api/admin/announcements/${editing.id}` : '/api/admin/announcements'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (!res.ok) { const d = await res.json(); return toast.error(d.error) }
    toast.success(editing ? 'Announcement updated.' : 'Announcement created.')
    setEditing(null); setForm({ title: '', summary: '', content: '', category: 'NEWS', published: true, pinned: false })
    fetch_()
  }
  const remove = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    toast.success('Deleted.')
    fetch_()
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader><CardTitle className="text-base">{editing ? 'Edit announcement' : 'New announcement'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Summary</Label><Input value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Content</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={5} /></div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm h-9">
                {['NEWS', 'UPDATE', 'EVENT', 'PARTNERSHIP', 'ACHIEVEMENT'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5"><Switch checked={form.published} onCheckedChange={v => setForm({ ...form, published: v })} /> <Label>Published</Label></div>
            <div className="flex items-center gap-2 pt-5"><Switch checked={form.pinned} onCheckedChange={v => setForm({ ...form, pinned: v })} /> <Label>Pinned</Label></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} className="bg-primary text-primary-foreground">{editing ? 'Save changes' : 'Publish'}</Button>
            {editing && <Button variant="outline" onClick={() => { setEditing(null); setForm({ title: '', summary: '', content: '', category: 'NEWS', published: true, pinned: false }) }}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-semibold mb-3">All announcements ({items.length})</h3>
        {loading ? <CenterSpinner /> : items.length === 0 ? <EmptyCard text="No announcements yet." /> : (
          <div className="space-y-2">
            {items.map((a) => (
              <Card key={a.id} className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{a.title}</span>
                        <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>
                        {a.pinned && <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Pinned</Badge>}
                        <Badge variant={a.published ? 'default' : 'secondary'} className={cn('text-[10px]', !a.published && 'bg-muted text-muted-foreground')}>{a.published ? 'Published' : 'Draft'}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{a.summary}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setForm({ title: a.title, summary: a.summary, content: a.content, category: a.category, published: a.published, pinned: a.pinned }) }}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(a.id)}><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Waitlist ──
function WaitlistTab() {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetch_ = async () => {
    const res = await fetch('/api/admin/waitlist')
    const d = await res.json()
    if (res.ok) setEntries(d.entries)
    setLoading(false)
  }
  useEffect(() => { fetch_() }, [])
  const markContacted = async (id: string) => {
    await fetch(`/api/admin/waitlist/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CONTACTED' }) })
    fetch_()
  }
  const remove = async (id: string) => {
    if (!confirm('Remove this waitlist entry?')) return
    await fetch(`/api/admin/waitlist/${id}`, { method: 'DELETE' })
    fetch_()
  }
  if (loading) return <CenterSpinner />
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Waitlist entries ({entries.length})</h3>
      {entries.length === 0 ? <EmptyCard text="No waitlist entries yet." /> : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.id} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{e.name}</span>
                      <Badge variant={e.status === 'CONFIRMED' ? 'default' : 'secondary'} className={cn('text-[10px]', e.status === 'CONTACTED' && 'bg-emerald-500/10 text-emerald-600 border-0')}>{e.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{e.email}{e.company ? ` · ${e.company}` : ''}{e.role ? ` · ${e.role}` : ''}</div>
                    {e.interest && <p className="text-sm mt-1.5">Interest: {e.interest}</p>}
                    {e.message && <p className="text-xs text-muted-foreground mt-1">{e.message}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {e.status === 'CONFIRMED' && <Button size="sm" variant="outline" onClick={() => markContacted(e.id)}>Mark contacted</Button>}
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(e.id)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Activity ──
function ActivityTab() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/admin/activity?limit=200').then(r => r.json()).then(d => { if (d.logs) setLogs(d.logs) }).finally(() => setLoading(false))
  }, [])
  if (loading) return <CenterSpinner />
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Activity log ({logs.length})</h3>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}><RefreshCw className="size-3.5 mr-1.5" /> Refresh</Button>
      </div>
      {logs.length === 0 ? <EmptyCard text="No activity recorded yet." /> : (
        <Card className="border-border/60"><CardContent className="p-0">
          <div className="divide-y divide-border max-h-[60vh] overflow-y-auto nexora-scroll">
            {logs.map((l) => (
              <div key={l.id} className="flex items-start gap-3 p-3">
                <div className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm"><span className="font-medium">{l.user?.name || 'System'}</span> <span className="text-muted-foreground">{l.action.replace(/_/g, ' ')}</span></div>
                  {l.details && l.details !== '{}' && <div className="text-xs text-muted-foreground font-mono truncate">{l.details}</div>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(l.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  )
}

function CenterSpinner() {
  return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
}
function EmptyCard({ text }: { text: string }) {
  return <Card className="border-dashed"><CardContent className="p-8 text-center text-sm text-muted-foreground">{text}</CardContent></Card>
}
