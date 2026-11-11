'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Hash, Lock, Menu, ShieldCheck, Trash2, UserPlus, FileText } from 'lucide-react'
import { toast } from 'sonner'
import type { DashboardUser } from '@/components/dashboard/dashboard-app'
import { api, initials, type Main, type SpaceDetail } from './types'
import { SpaceTile } from './space-tile'

export function SpaceHome({ detail, user, online, onSelect, onChanged, onLeftOrDeleted, onJoinSpace, onOpenSidebar }: {
  detail: SpaceDetail; user: DashboardUser; online: Set<string>
  onSelect: (m: Main) => void; onChanged: () => void; onLeftOrDeleted: () => void; onJoinSpace: () => void; onOpenSidebar: () => void
}) {
  const { space, access, channels, pages, members } = detail
  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [name, setName] = useState(space.name)
  const [desc, setDesc] = useState(space.description || '')
  const isOrgAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
  const memberIds = new Set(members.map((m) => m.id))

  const search = async (v: string) => {
    setQ(v)
    if (!v.trim()) return setResults([])
    const r = await api(`/api/users?q=${encodeURIComponent(v)}`)
    if (r.ok) setResults(r.data.users.filter((u: any) => !memberIds.has(u.id)))
  }
  const add = async (userId: string) => {
    const r = await api(`/api/spaces/${space.id}/members`, { method: 'POST', json: { userIds: [userId] } })
    if (!r.ok) return toast.error(r.error)
    setResults((p) => p.filter((u) => u.id !== userId)); onChanged()
  }
  const setRole = async (userId: string, role: string) => {
    const r = await api(`/api/spaces/${space.id}/members/${userId}`, { method: 'PATCH', json: { role } })
    r.ok ? onChanged() : toast.error(r.error)
  }
  const remove = async (userId: string, self = false) => {
    if (!confirm(self ? 'Leave this space?' : 'Remove this member from the space?')) return
    const r = await api(`/api/spaces/${space.id}/members/${userId}`, { method: 'DELETE' })
    if (!r.ok) return toast.error(r.error)
    self ? onLeftOrDeleted() : onChanged()
  }
  const patch = async (data: object, okMsg: string) => {
    const r = await api(`/api/spaces/${space.id}`, { method: 'PATCH', json: data })
    r.ok ? (toast.success(okMsg), onChanged()) : toast.error(r.error)
  }
  const destroy = async () => {
    if (!confirm(`Delete "${space.name}" with ALL its channels, messages and pages? This cannot be undone.`)) return
    if (prompt(`Type the space name to confirm: ${space.name}`) !== space.name) return toast.error('Name did not match.')
    const r = await api(`/api/spaces/${space.id}`, { method: 'DELETE' })
    r.ok ? (toast.success('Space deleted.'), onLeftOrDeleted()) : toast.error(r.error)
  }

  const roots = pages.filter((p) => !p.parentId)

  return (
    <div className="h-full overflow-y-auto nexora-scroll">
      <header className="h-14 border-b border-border flex items-center gap-2 px-3 sm:px-5 sticky top-0 bg-background z-10">
        <Button variant="ghost" size="icon" className="md:hidden -ml-1" onClick={onOpenSidebar} aria-label="Open menu"><Menu className="size-5" /></Button>
        <h2 className="font-bold">{space.name}</h2>
        {access.viaAdmin && <Badge variant="outline" className="gap-1 text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400"><ShieldCheck className="size-3" />Admin view</Badge>}
        {space.archived && <Badge variant="secondary">Archived</Badge>}
      </header>

      <div className="max-w-4xl mx-auto p-5 sm:p-8">
        <div className="flex items-center gap-4">
          <SpaceTile name={space.name} icon={space.icon} color={space.color} size={64} />
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight truncate">{space.name}</h1>
            <p className="text-sm text-muted-foreground">{space.description || 'No description yet.'}</p>
          </div>
          {!access.isMember && access.canJoin && <Button className="ml-auto" onClick={onJoinSpace}>{access.viaAdmin ? 'Join as admin' : 'Join space'}</Button>}
        </div>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
            {access.canManage && <TabsTrigger value="settings">Settings</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="mt-4 grid md:grid-cols-2 gap-4">
            <section className="rounded-xl border border-border p-4">
              <h3 className="font-semibold mb-2">Channels</h3>
              {channels.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
              {channels.map((c) => (
                <button key={c.id} onClick={() => onSelect({ kind: 'chat', id: c.id })} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm text-left">
                  {c.isPrivate ? <Lock className="size-4" /> : <Hash className="size-4" />}<span className="font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground truncate flex-1">{c.topic}</span><span className="text-xs text-muted-foreground">{c.memberCount}</span>
                </button>
              ))}
            </section>
            <section className="rounded-xl border border-border p-4">
              <h3 className="font-semibold mb-2">Pages</h3>
              {roots.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
              {roots.map((p) => (
                <button key={p.id} onClick={() => onSelect({ kind: 'page', id: p.id })} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm text-left">
                  <span>{p.icon || <FileText className="size-4" />}</span><span className="font-medium truncate">{p.title}</span>
                </button>
              ))}
            </section>
          </TabsContent>

          <TabsContent value="members" className="mt-4 space-y-3">
            {access.canManage && (
              <div className="rounded-xl border border-border p-3 space-y-2">
                <Input value={q} onChange={(e) => search(e.target.value)} placeholder="Add people to this space…" aria-label="Search people to add" />
                {results.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-muted">
                    <Avatar className="size-8"><AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{u.name}</div><div className="text-xs text-muted-foreground truncate">{u.email}</div></div>
                    <Button size="sm" variant="outline" onClick={() => add(u.id)} className="gap-1"><UserPlus className="size-3.5" />Add</Button>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-xl border border-border divide-y divide-border">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3">
                  <div className="relative">
                    <Avatar className="size-9"><AvatarImage src={m.image || undefined} /><AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(m.name)}</AvatarFallback></Avatar>
                    {online.has(m.id) && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-green-500 ring-2 ring-background" aria-label="Online" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{m.name}{m.id === user.id && <span className="text-muted-foreground"> (you)</span>}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.title || m.email}</div>
                  </div>
                  {access.canManage ? (
                    <Select value={m.spaceRole} onValueChange={(v) => setRole(m.id, v)}>
                      <SelectTrigger className="w-28 h-8" aria-label={`Role for ${m.name}`}><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="OWNER">Owner</SelectItem><SelectItem value="ADMIN">Admin</SelectItem><SelectItem value="MEMBER">Member</SelectItem></SelectContent>
                    </Select>
                  ) : <Badge variant="secondary">{m.spaceRole.toLowerCase()}</Badge>}
                  {(access.canManage && m.id !== user.id) && <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(m.id)} aria-label={`Remove ${m.name}`}><Trash2 className="size-4" /></Button>}
                </div>
              ))}
            </div>
            {access.isMember && <Button variant="outline" onClick={() => remove(user.id, true)}>Leave space</Button>}
          </TabsContent>

          {access.canManage && (
            <TabsContent value="settings" className="mt-4 space-y-4 max-w-xl">
              <div className="space-y-1.5"><Label htmlFor="s-name">Name</Label><Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></div>
              <div className="space-y-1.5"><Label htmlFor="s-desc">Description</Label><Textarea id="s-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></div>
              <Button onClick={() => patch({ name, description: desc }, 'Saved.')}>Save</Button>
              <div className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div><div className="text-sm font-semibold">Visibility: {space.visibility === 'PUBLIC' ? 'Public' : 'Private'}</div>
                    <div className="text-xs text-muted-foreground">{space.visibility === 'PUBLIC' ? 'Anyone can find and join.' : 'Invite only. Org admins can still open it.'}</div></div>
                  <Button variant="outline" size="sm" onClick={() => patch({ visibility: space.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC' }, 'Visibility updated.')}>Make {space.visibility === 'PUBLIC' ? 'private' : 'public'}</Button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div><div className="text-sm font-semibold">{space.archived ? 'Archived' : 'Archive space'}</div><div className="text-xs text-muted-foreground">Archived spaces are read-only.</div></div>
                  <Button variant="outline" size="sm" onClick={() => patch({ archived: !space.archived }, space.archived ? 'Restored.' : 'Archived.')}>{space.archived ? 'Restore' : 'Archive'}</Button>
                </div>
              </div>
              {(isOrgAdmin || access.role === 'OWNER') && (
                <div className="rounded-xl border border-destructive/40 p-4 flex items-center justify-between gap-3">
                  <div><div className="text-sm font-semibold text-destructive">Delete space</div><div className="text-xs text-muted-foreground">Removes every channel, message and page.</div></div>
                  <Button variant="destructive" size="sm" onClick={destroy}>Delete</Button>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
