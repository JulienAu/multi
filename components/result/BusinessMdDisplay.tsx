'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface BusinessMdDisplayProps {
  content: string
}

export function BusinessMdDisplay({ content }: BusinessMdDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border border-ui-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-ui-bg-tertiary border-b border-ui-border flex items-center justify-between">
        <span className="text-xs font-medium text-ui-text-primary">BUSINESS.md</span>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? 'Copié !' : 'Copier'}
        </Button>
      </div>
      <div className="p-6 max-h-[65vh] overflow-y-auto bg-ui-bg-secondary">
        <pre className="whitespace-pre-wrap font-mono text-xs text-ui-text-primary leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  )
}
