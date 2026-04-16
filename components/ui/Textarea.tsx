'use client'

import { forwardRef } from 'react'

type TextareaProps = React.ComponentProps<'textarea'>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={4}
        className={`w-full rounded-lg border border-ui-border bg-ui-bg px-4 py-3 text-base text-ui-text-primary placeholder:text-ui-text-tertiary focus:border-brand-violet focus:outline-none focus:ring-1 focus:ring-brand-violet transition-colors resize-none ${className}`}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
