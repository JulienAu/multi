'use client'

import { Input } from '@/components/ui/Input'

interface TextAnswerProps {
  value: string | undefined
  placeholder?: string
  onChange: (value: string) => void
}

export function TextAnswer({ value, placeholder, onChange }: TextAnswerProps) {
  return (
    <Input
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      autoFocus
    />
  )
}
