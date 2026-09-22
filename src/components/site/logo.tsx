import { cn } from '@/lib/utils'

export function Logo({ className, showWordmark = true, size = 32 }: { className?: string; showWordmark?: boolean; size?: number }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 48 48" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <defs>
            <linearGradient id="nx-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0f766e" />
              <stop offset="0.55" stopColor="#14b8a6" />
              <stop offset="1" stopColor="#84cc16" />
            </linearGradient>
          </defs>
          <rect width="48" height="48" rx="13" fill="url(#nx-grad)" />
          <circle cx="34.5" cy="13.5" r="3.4" fill="#ecfccb" />
          <circle cx="34.5" cy="13.5" r="3.4" fill="#ecfccb" opacity="0.5">
            <animate attributeName="r" values="3.4;5.2;3.4" dur="3.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="3.4s" repeatCount="indefinite" />
          </circle>
          <path d="M14 33V15.5L26.5 33V15.5" stroke="#f0fdf4" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M30 33V15.5" stroke="#bef264" strokeWidth="3.4" strokeLinecap="round" opacity="0.9" />
        </svg>
      </div>
      {showWordmark && (
        <span className="font-extrabold tracking-tight text-lg leading-none">
          NEXORA<span className="brand-gradient-text">LABS</span>
        </span>
      )}
    </div>
  )
}
