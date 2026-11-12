'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional strength meter — shows a colored bar under the input */
  showStrength?: boolean
}

function strength(score: number) {
  if (score <= 1) return { label: 'Weak', color: 'bg-destructive', width: '33%' }
  if (score <= 3) return { label: 'Fair', color: 'bg-amber-500', width: '66%' }
  return { label: 'Strong', color: 'bg-emerald-500', width: '100%' }
}

function calcScore(value: string) {
  let score = 0
  if (value.length >= 8) score++
  if (/[A-Z]/.test(value)) score++
  if (/[0-9]/.test(value)) score++
  if (/[^A-Za-z0-9]/.test(value)) score++
  return score
}

export const PasswordInput = ({ className, showStrength, value, ...props }: PasswordInputProps) => {
  const [show, setShow] = useState(false)
  const val = (value as string) || ''
  const score = calcScore(val)
  const s = strength(score)

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          className={cn('pr-10', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-0 top-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showStrength && val.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden max-w-32">
            <div className={cn('h-full rounded-full transition-all', s.color)} style={{ width: s.width }} />
          </div>
          <span className="text-xs text-muted-foreground">{s.label}</span>
        </div>
      )}
    </div>
  )
}
