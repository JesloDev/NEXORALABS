'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PasswordInput } from '@/components/ui/password-input'
import { KeyRound, Mail, User as UserIcon, ShieldCheck, Loader2, CheckCircle2, Crown, Pencil, X, Save } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface ProfileUser {
  id: string
  email: string
  name: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE'
  status: string
  emailVerified: Date | null
  image?: string | null
  title?: string | null
  department?: string | null
  phone?: string | null
  bio?: string | null
  location?: string | null
  lastLoginAt: Date | null
  createdAt: Date
  passwordChangedAt: Date | null
}

function initials(name: string) {
  return name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export function ProfileView({ user: initialUser }: { user: ProfileUser }) {
  const [user, setUser] = useState<ProfileUser>(initialUser)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [editing, setEditing] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profile, setProfile] = useState({
    name: initialUser.name,
    title: initialUser.title || '',
    department: initialUser.department || '',
    phone: initialUser.phone || '',
    bio: initialUser.bio || '',
    location: initialUser.location || '',
  })

  const saveProfile = async () => {
    if (profile.name.trim().length < 2) return toast.error('Name must be at least 2 characters.')
    setProfileLoading(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to update profile.')
        return
      }
      setUser({ ...user, ...data.user })
      setEditing(false)
      toast.success('Profile updated.')
    } catch {
      toast.error('Network error.')
    } finally {
      setProfileLoading(false)
    }
  }

  const cancelEdit = () => {
    setEditing(false)
    setProfile({ name: user.name, title: user.title || '', department: user.department || '', phone: user.phone || '', bio: user.bio || '', location: user.location || '' })
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwd.newPassword.length < 8) return toast.error('New password must be at least 8 characters.')
    if (pwd.newPassword !== pwd.confirm) return toast.error('Passwords do not match.')
    setPwdLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to change password.')
        return
      }
      toast.success('Password changed. We sent a confirmation to your email.')
      setPwd({ currentPassword: '', newPassword: '', confirm: '' })
    } catch {
      toast.error('Network error.')
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto nexora-scroll">
      <div className="max-w-3xl mx-auto p-5 sm:p-8 pb-20 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={user.image || undefined} />
            <AvatarFallback className="text-xl font-semibold bg-primary/15 text-primary">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {user.name}
              {user.role === 'SUPER_ADMIN' && <Crown className="size-5 text-amber-500" />}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={user.role === 'SUPER_ADMIN' ? 'default' : 'secondary'} className="gap-1">
                <ShieldCheck className="size-3" />
                {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'ADMIN' ? 'Admin' : 'Team Member'}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="size-3.5" /> {user.email}</span>
            </div>
          </div>
          {!editing && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-4 mr-2" /> Edit profile
            </Button>
          )}
        </div>

        {/* Profile details (view / edit) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><UserIcon className="size-4 text-primary" /> Profile details</CardTitle>
            {editing && (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={profileLoading}><X className="size-4 mr-1" /> Cancel</Button>
                <Button size="sm" onClick={saveProfile} disabled={profileLoading} className="bg-primary text-primary-foreground">
                  {profileLoading ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />} Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="p-name">Full name *</Label>
                  <Input id="p-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Your full name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-title">Title</Label>
                  <Input id="p-title" value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} placeholder="e.g. Product Engineer" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-dept">Department</Label>
                  <Input id="p-dept" value={profile.department} onChange={(e) => setProfile({ ...profile, department: e.target.value })} placeholder="e.g. Engineering" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-phone">Phone</Label>
                  <Input id="p-phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="e.g. +234 800 000 0000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-location">Location</Label>
                  <Input id="p-location" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} placeholder="e.g. Lagos, Nigeria" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="p-bio">Bio</Label>
                  <Textarea id="p-bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Tell the team about yourself..." rows={3} />
                </div>
              </div>
            ) : (
              <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                <Detail label="Title" value={user.title} />
                <Detail label="Department" value={user.department} />
                <Detail label="Phone" value={user.phone} />
                <Detail label="Location" value={user.location} />
                <Detail label="Member since" value={new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })} />
                <Detail label="Last login" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'} />
                <Detail label="Password last changed" value={user.passwordChangedAt ? new Date(user.passwordChangedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Never'} />
                <Detail label="Email verified" value={user.emailVerified ? 'Yes' : 'No'} />
              </dl>
            )}
            {user.bio && !editing && (
              <div className="mt-4 pt-4 border-t border-border">
                <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bio</dt>
                <dd className="text-sm text-foreground/90 leading-relaxed">{user.bio}</dd>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Change password */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><KeyRound className="size-4 text-primary" /> Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label htmlFor="current">Current password</Label>
                <PasswordInput id="current" autoComplete="current-password" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} placeholder="Enter your current password" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new">New password</Label>
                <PasswordInput id="new" autoComplete="new-password" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} placeholder="At least 8 characters" required showStrength />
                <p className="text-xs text-muted-foreground">Use a strong, unique password you don't reuse elsewhere.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm new password</Label>
                <PasswordInput id="confirm" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} placeholder="Re-enter your new password" required />
              </div>
              <Button type="submit" disabled={pwdLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                {pwdLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle2 className="size-4 mr-2" />}
                {pwdLoading ? 'Updating...' : 'Update password'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Forgot your password?{' '}
                <button type="button" onClick={() => signOut({ callbackUrl: '/auth/forgot-password' })} className="text-primary hover:underline">
                  Sign out and reset it
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 font-medium">{value || '—'}</dd>
    </div>
  )
}
