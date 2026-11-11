import { cn } from '@/lib/utils'

// Official NEXORALABS logo set (public/brand). Files are used exactly as supplied — do not recolour or redraw.
//  horizontal → site header, sign-in, verify pages (light artwork in light mode, dark artwork in dark mode)
//  icon       → app icon tile for tight spaces such as the workspace rail
export function Logo({
  className, size = 40, variant = 'horizontal',
}: { className?: string; size?: number; variant?: 'horizontal' | 'icon' }) {
  if (variant === 'icon') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/brand/icon-app.png" alt="NEXORALABS" width={size} height={size} className={cn('rounded-[22%]', className)} />
  }
  const alt = 'NEXORALABS — Innovate · Create · Grow'
  const style = { height: size, width: 'auto' } as const
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-horizontal-light.png" alt={alt} height={size} style={style} className={cn('rounded-lg dark:hidden', className)} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-horizontal.png" alt={alt} height={size} style={style} className={cn('rounded-lg hidden dark:block', className)} />
    </>
  )
}
