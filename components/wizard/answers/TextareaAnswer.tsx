'use client'

import { Textarea } from '@/components/ui/Textarea'

interface TextareaAnswerProps {
  value: string | undefined
  placeholder?: string
  onChange: (value: string) => void
}

export function TextareaAnswer({ value, placeholder, onChange }: TextareaAnswerProps) {
  return (
    <Textarea
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      autoFocus
    />
  )
}
