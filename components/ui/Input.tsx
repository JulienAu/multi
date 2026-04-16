'use client'

import { forwardRef } from 'react'

type InputProps = React.ComponentProps<'input'>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-lg border border-ui-border bg-ui-bg px-4 py-3 text-base text-ui-text-primary placeholder:text-ui-text-tertiary focus:border-brand-violet focus:outline-none focus:ring-1 focus:ring-brand-violet transition-colors ${className}`}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
