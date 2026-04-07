import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 shadow-sm outline-none transition-colors placeholder:text-slate-500 focus:border-slate-500 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-950/70',
        className,
      )}
      {...props}
    />
  ),
)

Input.displayName = 'Input'

export { Input }
