interface MetricCardProps {
  label: string
  value: string
  sub?: string
  variation?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function MetricCard({ label, value, sub, variation, trend }: MetricCardProps) {
  const trendColor = trend === 'up' ? 'text-brand-green' : trend === 'down' ? 'text-status-error' : 'text-ui-text-tertiary'
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''

  return (
    <div className="rounded-lg border border-ui-border bg-ui-bg p-4">
      <p className="text-xs text-ui-text-tertiary mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-xl font-medium text-ui-text-primary">{value}</p>
        {variation && (
          <span className={`text-xs font-medium ${trendColor}`}>
            {trendArrow} {variation}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-ui-text-secondary mt-0.5">{sub}</p>}
    </div>
  )
}
