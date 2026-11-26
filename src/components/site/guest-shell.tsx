import Link from 'next/link'
import { Logo } from '@/components/site/logo'

// Minimal frame for outside guests: logo only, no company navigation.
export function GuestShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-md px-4 h-14 flex items-center"><Link href="/" aria-label="NEXORALABS"><Logo /></Link></div>
      </header>
      <main className="flex-1 flex items-start sm:items-center justify-center p-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
