'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Menu, Moon, Sun, Home, UserPlus, LogIn, Info } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Logo } from './logo'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

const items = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/#about', label: 'About', icon: Info },
  { href: '/waitlist', label: 'Join the waitlist', icon: UserPlus },
  { href: '/auth/signin', label: 'Sign in', icon: LogIn },
]

// Mobile-only top bar for every public sub-page: back button, logo, and the menu.
export function MobileTopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => setOpen(false), [pathname])

  const back = () => {
    // history.length > 1 means there is somewhere to go back to inside this tab/app
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/')
  }

  return (
    <div className="md:hidden sticky top-0 z-40 h-14 pt-[env(safe-area-inset-top)] box-content bg-background/90 backdrop-blur-xl border-b border-border flex items-center gap-1 px-2">
      <Button variant="ghost" size="icon" onClick={back} aria-label="Go back"><ArrowLeft className="size-5" /></Button>
      <Link href="/" aria-label="NEXORALABS home" className="mx-auto"><Logo size={34} /></Link>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-5" /></Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[min(85vw,20rem)] p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] border-b border-border"><Logo size={38} /></div>
          <nav className="p-3 space-y-1">
            {items.map((i) => (
              <Link key={i.href} href={i.href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium hover:bg-muted">
                <i.icon className="size-4 text-muted-foreground" />{i.label}
              </Link>
            ))}
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium hover:bg-muted text-left">
              {mounted && theme === 'dark' ? <Sun className="size-4 text-muted-foreground" /> : <Moon className="size-4 text-muted-foreground" />}
              {mounted && theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  )
}
