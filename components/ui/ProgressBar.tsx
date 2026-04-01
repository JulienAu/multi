'use client'

interface ProgressBarProps {
  current: number
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = Math.round((current / total) * 100)

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-ui-text-tertiary">{current}/{total}</span>
        <span className="text-xs text-ui-text-tertiary">{pct}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-ui-bg-tertiary overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-violet transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
