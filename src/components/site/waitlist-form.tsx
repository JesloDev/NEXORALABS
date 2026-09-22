'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', company: '', role: '', interest: '', message: '' })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.name) {
      toast.error('Please enter your name and email.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/waitlist/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Something went wrong.')
        return
      }
      if (data.alreadyConfirmed) {
        toast.success("You're already on the waitlist!")
        setDone(true)
        return
      }
      // In dev (no email service) the verify URL is returned — auto-redirect.
      if (data.devVerifyUrl) {
        toast.success('Verification email sent. Redirecting to confirm your email...')
        setTimeout(() => router.push(data.devVerifyUrl), 1200)
      } else {
        setDone(true)
        toast.success('Check your inbox to confirm your email!')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-card p-8 text-center glow-ring">
        <div className="mx-auto size-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <CheckCircle2 className="size-7 text-primary" />
        </div>
        <h3 className="text-xl font-bold">Almost there!</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          We've sent a verification link to <span className="font-semibold text-foreground">{form.email}</span>. Click it to confirm your email and secure your spot on the waitlist.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className={compact ? 'space-y-3' : 'rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-4'}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="wl-name">Full name *</Label>
          <Input id="wl-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ada Okonkwo" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wl-email">Email *</Label>
          <Input id="wl-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" required />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="wl-company">Company / Organization</Label>
          <Input id="wl-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Optional" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wl-role">Your role</Label>
          <Input id="wl-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Founder, Investor, Researcher..." />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="wl-interest">What would you like to build with NEXORALABS?</Label>
        <Input id="wl-interest" value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })} placeholder="e.g. A climate-smart agriculture platform" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="wl-message">Anything else?</Label>
        <Textarea id="wl-message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us about your idea..." rows={3} />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full h-12">
        {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
        {loading ? 'Sending...' : 'Join the waitlist'}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        We'll send a verification email to confirm your address. Waitlist members are not given internal accounts.
      </p>
    </form>
  )
}
