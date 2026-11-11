import { cn } from '@/lib/utils'
import { initials } from './types'

export function SpaceTile({ name, icon, color, size = 40, className }: { name: string; icon?: string | null; color?: string | null; size?: number; className?: string }) {
  return (
    <div
      className={cn('flex items-center justify-center rounded-xl font-bold text-white shrink-0 select-none', className)}
      style={{ width: size, height: size, background: color || '#166534', fontSize: size * 0.4 }}
    >
      {icon || initials(name).slice(0, 2)}
    </div>
  )
}
