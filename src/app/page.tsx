import Link from 'next/link'
import { db } from '@/lib/db'
import { SiteNav } from '@/components/site/nav'
import { Logo } from '@/components/site/logo'
import { WaitlistForm } from '@/components/site/waitlist-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Lightbulb, HeartHandshake, TrendingUp, Leaf, ShieldCheck, Globe2,
  ArrowRight, Sparkles, Users, Rocket, MessageSquare, CheckCircle2, Quote, ArrowUpRight,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getAnnouncements() {
  try {
    return await db.announcement.findMany({
      where: { published: true },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      take: 6,
      select: {
        id: true, title: true, summary: true, content: true,
        category: true, imageUrl: true, pinned: true, publishedAt: true,
      },
    })
  } catch {
    return []
  }
}

const categoryColor: Record<string, string> = {
  NEWS: 'bg-primary/10 text-primary',
  UPDATE: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
  EVENT: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  PARTNERSHIP: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  ACHIEVEMENT: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300',
}

export default async function LandingPage() {
  const announcements = await getAnnouncements()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNav />

      {/* ───────── HERO ───────── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0 hero-grid opacity-60" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <Badge className="mb-6 rounded-full border-primary/20 bg-primary/5 text-primary hover:bg-primary/10">
                <Sparkles className="size-3.5 mr-1.5" />
                In partnership with the UN Sustainable Development Goals
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                Turning bold ideas into
                <span className="brand-gradient-text"> sustainable solutions</span>.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                NEXORALABS is an innovation studio and impact platform. We partner with founders, communities, and institutions to transform ideas into scalable, SDG-aligned solutions that deliver lasting value for people and the planet.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 px-7">
                  <Link href="#waitlist">
                    Join the waitlist
                    <ArrowRight className="size-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-7 font-semibold">
                  <Link href="#work">Explore our work</Link>
                </Button>
              </div>

              <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
                {[
                  { k: '17', l: 'SDGs aligned' },
                  { k: '50+', l: 'Ideas in motion' },
                  { k: '100%', l: 'Impact-driven' },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="text-3xl font-extrabold brand-gradient-text">{s.k}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-[var(--brand-accent)]/20 blur-2xl rounded-3xl" aria-hidden />
                <Card className="relative glow-ring border-border/60 bg-card/80 backdrop-blur-xl overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-primary via-teal-400 to-[var(--brand-accent)]" />
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Rocket className="size-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">Innovation Pipeline</div>
                          <div className="text-xs text-muted-foreground">Live impact tracker</div>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-0">
                        <span className="size-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" /> Live
                      </Badge>
                    </div>
                    {[
                      { icon: Leaf, name: 'Climate-smart agriculture', sdg: 'SDG 2 · 13', val: 78 },
                      { icon: HeartHandshake, name: 'Inclusive health access', sdg: 'SDG 3 · 10', val: 64 },
                      { icon: Globe2, name: 'Clean energy microgrids', sdg: 'SDG 7', val: 52 },
                    ].map((row) => (
                      <div key={row.name} className="rounded-xl border border-border/60 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <row.icon className="size-4 text-primary" />
                            <span className="text-sm font-medium">{row.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{row.sdg}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--brand-accent)]" style={{ width: `${row.val}%` }} />
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                      <ShieldCheck className="size-3.5 text-primary" />
                      Every solution mapped to measurable SDG targets.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── SDG STRIP ───────── */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Aligned with the Global Goals</span>
            {['No Poverty', 'Zero Hunger', 'Good Health', 'Quality Education', 'Clean Energy', 'Decent Work', 'Climate Action', 'Partnerships'].map((g) => (
              <span key={g} className="flex items-center gap-1.5">
                <Leaf className="size-3.5 text-primary" />
                {g}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── ABOUT / PILLARS ───────── */}
      <section id="about" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-4">Who we are</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              We are builders of <span className="brand-gradient-text">sustainable impact</span>.
            </h2>
            <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
              NEXORALABS exists at the intersection of innovation, support, and growth. We don't just build software — we engineer solutions that create lasting, measurable change aligned with the United Nations Sustainable Development Goals.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { icon: Lightbulb, title: 'Innovation', desc: 'We turn ambitious ideas into deployable products — engineering with rigor and imagination, from concept to scale.', color: 'from-teal-500 to-emerald-400' },
              { icon: HeartHandshake, title: 'Support', desc: 'We stand with founders and communities, providing mentorship, secure tooling, and partnership at every milestone.', color: 'from-emerald-500 to-lime-400' },
              { icon: TrendingUp, title: 'Growth', desc: 'We design for sustainable scale — solutions that grow impact, revenue, and resilience over time.', color: 'from-lime-500 to-teal-400' },
            ].map((p) => (
              <Card key={p.title} className="group relative overflow-hidden border-border/60 hover:border-primary/40 transition-colors">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${p.color}`} />
                <CardContent className="p-6">
                  <div className={`size-12 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center mb-5 shadow-sm`}>
                    <p.icon className="size-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">{p.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── SDG PARTNERSHIP ───────── */}
      <section id="sdg" className="py-20 sm:py-28 bg-muted/30 border-y border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Our commitment</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                A partnership with the <span className="brand-gradient-text">Sustainable Development Goals</span>.
              </h2>
              <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                Every solution we ship is mapped to specific SDG targets. From clean energy and climate action to quality education and decent work, we measure success not only in revenue, but in real-world impact.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Impact-first engineering — every product links to measurable SDG outcomes',
                  'Transparent reporting on progress toward global goals',
                  'Partnerships with mission-aligned founders, NGOs, and institutions',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground/90">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { n: '1', l: 'No Poverty', c: 'bg-[#E5243B]/10 text-[#E5243B]' },
                { n: '2', l: 'Zero Hunger', c: 'bg-[#DDA63A]/10 text-[#DDA63A]' },
                { n: '3', l: 'Good Health', c: 'bg-[#4C9F38]/10 text-[#4C9F38]' },
                { n: '4', l: 'Education', c: 'bg-[#C5192D]/10 text-[#C5192D]' },
                { n: '7', l: 'Clean Energy', c: 'bg-[#FCC30B]/10 text-[#FCC30B]' },
                { n: '8', l: 'Decent Work', c: 'bg-[#A21942]/10 text-[#A21942]' },
                { n: '13', l: 'Climate Action', c: 'bg-[#3F7E44]/10 text-[#3F7E44]' },
                { n: '17', l: 'Partnerships', c: 'bg-[#19486A]/10 text-[#19486A] dark:text-sky-300' },
              ].map((g) => (
                <div key={g.n} className="rounded-2xl border border-border/60 bg-card p-4 text-center hover:shadow-sm transition-shadow">
                  <div className={`mx-auto size-12 rounded-xl ${g.c} flex items-center justify-center font-bold mb-2`}>
                    {g.n}
                  </div>
                  <div className="text-xs font-medium text-foreground/80">{g.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── WHAT WE DO ───────── */}
      <section id="work" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="secondary" className="mb-4">What we do</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">A full-spectrum innovation studio</h2>
            <p className="mt-4 text-muted-foreground text-lg">From the first spark of an idea to a scaled, sustainable product — we cover the whole journey.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Lightbulb, title: 'Ideation & Validation', desc: 'We help shape raw concepts into validated, SDG-aligned opportunities ready for engineering.' },
              { icon: Rocket, title: 'Product Engineering', desc: 'Secure, scalable software built with a modern stack — hardened backends and delightful experiences.' },
              { icon: ShieldCheck, title: 'Secure Collaboration', desc: 'A privacy-first internal platform with invite-only onboarding keeps teams moving safely.' },
              { icon: TrendingUp, title: 'Growth & Scaling', desc: 'Sustainable growth strategies that balance revenue, impact, and resilience.' },
              { icon: Globe2, title: 'Impact Reporting', desc: 'Transparent dashboards linking every initiative to measurable SDG outcomes.' },
              { icon: Users, title: 'Community & Partnership', desc: 'Connecting founders, mentors, and institutions to multiply collective impact.' },
            ].map((s) => (
              <Card key={s.title} className="border-border/60 hover:border-primary/40 hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <s.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── NEWS / ANNOUNCEMENTS ───────── */}
      <section id="news" className="py-20 sm:py-28 bg-muted/30 border-y border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 mb-12 flex-wrap">
            <div className="max-w-2xl">
              <Badge variant="secondary" className="mb-4">News & Announcements</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Latest from NEXORALABS</h2>
              <p className="mt-3 text-muted-foreground">Updates, partnerships, and milestones — published by our leadership team.</p>
            </div>
          </div>

          {announcements.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-10 text-center text-muted-foreground">
                <MessageSquare className="size-8 mx-auto mb-3 opacity-40" />
                Announcements will appear here soon.
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Featured */}
              <Card className="lg:col-span-2 overflow-hidden border-border/60 hover:shadow-md transition-shadow group">
                <div className="h-2 bg-gradient-to-r from-primary to-[var(--brand-accent)]" />
                <CardContent className="p-8">
                  <div className="flex items-center gap-2 mb-4">
                    {announcements[0].pinned && <Badge className="bg-primary/10 text-primary border-0"><Sparkles className="size-3 mr-1" />Pinned</Badge>}
                    <Badge className={`border-0 ${categoryColor[announcements[0].category] || categoryColor.NEWS}`}>{announcements[0].category}</Badge>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">{announcements[0].title}</h3>
                  <p className="mt-3 text-muted-foreground leading-relaxed">{announcements[0].summary}</p>
                  <p className="mt-4 text-sm text-foreground/80 leading-relaxed line-clamp-4">{announcements[0].content}</p>
                  <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                    {new Date(announcements[0].publishedAt || Date.now()).toLocaleDateString('en-US', { dateStyle: 'long' })}
                  </div>
                </CardContent>
              </Card>

              {/* Side list */}
              <div className="space-y-4">
                {announcements.slice(1, 5).map((a) => (
                  <Card key={a.id} className="border-border/60 hover:border-primary/40 hover:shadow-sm transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`border-0 text-[10px] ${categoryColor[a.category] || categoryColor.NEWS}`}>{a.category}</Badge>
                        {a.pinned && <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Pinned</Badge>}
                      </div>
                      <h4 className="font-semibold leading-snug">{a.title}</h4>
                      <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{a.summary}</p>
                      <div className="mt-3 text-xs text-muted-foreground">{new Date(a.publishedAt || Date.now()).toLocaleDateString('en-US', { dateStyle: 'medium' })}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ───────── TESTIMONIAL ───────── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <Quote className="size-10 mx-auto text-primary/40 mb-6" />
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug">
            “NEXORALABS didn't just build our product — they helped us understand the impact we could create. They turned our idea into a movement aligned with the goals that matter.”
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="size-11 rounded-full bg-gradient-to-br from-primary to-[var(--brand-accent)]" />
            <div className="text-left">
              <div className="font-semibold">Partner Founder</div>
              <div className="text-sm text-muted-foreground">Climate-smart agriculture startup</div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── WAITLIST CTA ───────── */}
      <section id="waitlist" className="py-20 sm:py-28 bg-muted/30 border-t border-border/60">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <Badge variant="secondary" className="mb-4">Join the movement</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Be first to build the future, sustainably.</h2>
              <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                Join the NEXORALABS waitlist to get early access to our innovation programs, partnership opportunities, and product launches. We'll verify your email to make sure we can reach you.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Early access to our innovation sprints',
                  'Partnership & collaboration opportunities',
                  'Insights on SDG-aligned ventures',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm">{t}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" />
                Already part of the team?
                <Link href="/auth/signin" className="font-semibold text-primary hover:underline inline-flex items-center gap-1">
                  Sign in to the internal circle <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
            <div id="waitlist-form">
              <WaitlistForm />
            </div>
          </div>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer className="mt-auto border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <Logo size={36} />
              <p className="mt-4 text-sm text-muted-foreground max-w-sm leading-relaxed">
                NEXORALABS turns ideas into sustainable solutions — in partnership with the UN Sustainable Development Goals. Innovate. Support. Grow.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#about" className="hover:text-foreground">About</Link></li>
                <li><Link href="#sdg" className="hover:text-foreground">SDG Partnership</Link></li>
                <li><Link href="#work" className="hover:text-foreground">What We Do</Link></li>
                <li><Link href="#news" className="hover:text-foreground">News</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Get started</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#waitlist" className="hover:text-foreground">Join the waitlist</Link></li>
                <li><Link href="/auth/signin" className="hover:text-foreground">Employee sign in</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} NEXORALABS. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              <Leaf className="size-3.5 text-primary" />
              Built for sustainable, scalable impact.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
