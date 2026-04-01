'use client'

interface BusinessMdPreviewProps {
  content: string
}

export function BusinessMdPreview({ content }: BusinessMdPreviewProps) {
  const lines = content.split('\n').length
  const sections = (content.match(/^## /gm) || []).length

  return (
    <div className="border border-ui-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-ui-bg-tertiary border-b border-ui-border flex items-center justify-between">
        <span className="text-xs font-medium text-ui-text-primary">BUSINESS.md</span>
        <span className="text-xs text-ui-text-tertiary">{lines} lignes, {sections} sections</span>
      </div>
      <div className="p-4 max-h-[70vh] overflow-y-auto">
        <pre className="whitespace-pre-wrap font-mono text-xs text-ui-text-primary leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  )
}
