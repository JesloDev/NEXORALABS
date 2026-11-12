'use client'

import { Home, LayoutGrid, Plus, Bell, ShieldCheck, Moon, Sun, LogOut, Search, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/site/logo'
import { SpaceTile } from './space-tile'
import type { SpaceSummary } from './types'

function RailButton({ label, active, onClick, children, badge, danger }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode; badge?: number; danger?: boolean }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} aria-current={active ? 'page' : undefined}
      className={cn('relative size-10 rounded-xl flex items-center justify-center text-rail-foreground/70 transition hover:bg-white/10 hover:text-rail-foreground focus-visible:outline-2 focus-visible:outline-lime-400',
        active && 'bg-white/15 text-rail-foreground', danger && 'hover:bg-red-500/20 hover:text-red-300')}>
      {children}
      {!!badge && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-lime-400 text-[10px] font-bold text-black flex items-center justify-center">{badge > 99 ? '99+' : badge}</span>}
    </button>
  )
}

export function SpaceRail({
  spaces, ctx, onHome, onSpace, onAllSpaces, onCreateSpace, onSearch, onNotifications, onProfile, onConsole, onTheme, onSignOut,
  isAdmin, dark, homeUnread, notificationsActive, consoleActive, allSpacesActive, profileActive,
}: {
  spaces: SpaceSummary[]; ctx: 'home' | string
  onHome: () => void; onSpace: (id: string) => void; onAllSpaces: () => void; onCreateSpace: () => void
  onSearch: () => void; onNotifications: () => void; onProfile: () => void; onConsole: () => void; onTheme: () => void; onSignOut: () => void
  isAdmin: boolean; dark: boolean; homeUnread: number; notificationsActive: boolean; consoleActive: boolean; allSpacesActive: boolean; profileActive: boolean
}) {
  // members' spaces first; admin-only (not joined) spaces live in the "All spaces" directory to keep the rail short
  const mine = spaces.filter((s) => s.isMember)
  // an admin currently inside a space they haven't joined still gets a rail tile for it
  const current = spaces.find((s) => s.id === ctx && !s.isMember)
  const shown = current ? [...mine, current] : mine

  return (
    <nav aria-label="Spaces" className="w-[68px] shrink-0 bg-rail text-rail-foreground flex flex-col items-center py-3 gap-2 h-full">
      <div className="mb-1"><Logo size={38} variant="icon" /></div>
      <RailButton label="Home & direct messages" active={ctx === 'home' && !allSpacesActive && !notificationsActive && !consoleActive} onClick={onHome} badge={homeUnread}><Home className="size-5" /></RailButton>
      <RailButton label="Search (Ctrl+K)" onClick={onSearch}><Search className="size-5" /></RailButton>
      <div className="w-8 h-px bg-white/15 my-1" />

      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-2 py-1 [scrollbar-width:none]">
        {shown.map((s) => {
          const active = ctx === s.id && !allSpacesActive && !notificationsActive && !consoleActive
          return (
            <button key={s.id} onClick={() => onSpace(s.id)} title={s.name} aria-label={s.name} aria-current={active ? 'page' : undefined}
              className={cn('relative shrink-0 rounded-xl p-0.5 transition focus-visible:outline-2 focus-visible:outline-lime-400', active ? 'ring-2 ring-lime-400' : 'opacity-85 hover:opacity-100')}>
              <SpaceTile name={s.name} icon={s.icon} color={s.color} size={38} />
              {s.viaAdmin && <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-amber-400 text-black flex items-center justify-center" aria-label="Admin view"><ShieldCheck className="size-2.5" /></span>}
              {s.unread > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-lime-400 text-[10px] font-bold text-black flex items-center justify-center">{s.unread > 99 ? '99+' : s.unread}</span>}
            </button>
          )
        })}
        <RailButton label={isAdmin ? 'All spaces (admin)' : 'Browse spaces'} active={allSpacesActive} onClick={onAllSpaces}><LayoutGrid className="size-5" /></RailButton>
        {isAdmin && <RailButton label="Create a space" onClick={onCreateSpace}><Plus className="size-5" /></RailButton>}
      </div>

      <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-white/10 w-full">
        <RailButton label="Notifications" active={notificationsActive} onClick={onNotifications}><Bell className="size-5" /></RailButton>
        <RailButton label="Your profile" active={profileActive} onClick={onProfile}><UserCircle className="size-5" /></RailButton>
        {isAdmin && <RailButton label="Admin console" active={consoleActive} onClick={onConsole}><ShieldCheck className="size-5" /></RailButton>}
        <RailButton label={dark ? 'Light mode' : 'Dark mode'} onClick={onTheme}>{dark ? <Sun className="size-5" /> : <Moon className="size-5" />}</RailButton>
        <RailButton label="Sign out" onClick={onSignOut} danger><LogOut className="size-5" /></RailButton>
      </div>
    </nav>
  )
}
