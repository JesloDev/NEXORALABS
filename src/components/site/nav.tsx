'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X, Moon, Sun } from 'lucide-react'
import { Logo } from './logo'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

const links = [
  { href: '#about', label: 'About' },
  { href: '#sdg', label: 'SDG Partnership' },
  { href: '#work', label: 'What We Do' },
  { href: '#news', label: 'News' },
  { href: '#waitlist', label: 'Waitlist' },
]

export function SiteNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled ? 'backdrop-blur-xl bg-background/80 border-b border-border/60 shadow-sm' : 'bg-transparent',
      )}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" aria-label="NEXORALABS home">
          <Logo />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {mounted && theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button asChild variant="ghost" className="font-medium">
            <Link href="/auth/signin">Sign in</Link>
          </Button>
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full">
            <Link href="#waitlist">Join the waitlist</Link>
          </Button>
        </div>

        <button
          className="md:hidden p-2 rounded-md hover:bg-muted"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              <Button asChild variant="outline" className="w-full" onClick={() => setOpen(false)}>
                <Link href="/auth/signin">Sign in</Link>
              </Button>
              <Button asChild className="w-full bg-primary text-primary-foreground rounded-full" onClick={() => setOpen(false)}>
                <Link href="#waitlist">Join the waitlist</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
