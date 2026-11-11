import { cn } from '@/lib/utils'

// Official NEXORALABS logo set (public/brand). Files are used exactly as supplied — do not recolour or redraw.
//  horizontal → site header, sign-in, verify pages (dark-background artwork, shown as a rounded badge)
//  icon       → app icon tile for tight spaces such as the workspace rail
export function Logo({
  className, size = 40, variant = 'horizontal',
}: { className?: string; size?: number; variant?: 'horizontal' | 'icon' }) {
  if (variant === 'icon') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/brand/icon-app.png" alt="NEXORALABS" width={size} height={size} className={cn('rounded-[22%]', className)} />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/logo-horizontal.png" alt="NEXORALABS — Innovate · Create · Grow" height={size} style={{ height: size, width: 'auto' }} className={cn('rounded-lg', className)} />
}
