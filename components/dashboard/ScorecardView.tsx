'use client'

interface ScorecardData {
  value: number
  acquisition: number
  leverage: number
  uptake: number
  enhancement: number
}

interface PillarConfig {
  key: keyof ScorecardData
  letter: string
  label: string
  description: string
  action: string
}

const PILLARS: PillarConfig[] = [
  { key: 'value',       letter: 'V', label: 'Value',       description: "La force de votre offre",                 action: "Ameliorer le pricing et la proposition de valeur" },
  { key: 'acquisition', letter: 'A', label: 'Acquisition', description: "Comment vous trouvez des clients",        action: "Intensifier la prospection et le marketing" },
  { key: 'leverage',    letter: 'L', label: 'Leverage',    description: "Comment vous convertissez",               action: "Optimiser les pages de vente et objections" },
  { key: 'uptake',      letter: 'U', label: 'Uptake',      description: "Comment vous livrez la valeur",           action: "Ameliorer le support et la satisfaction" },
  { key: 'enhancement', letter: 'E', label: 'Enhancement', description: "Comment vous vous ameliorez en continu",  action: "Lancer des A/B tests et analyser les hypotheses" },
]

interface ScorecardViewProps {
  scorecard: ScorecardData
  arsName: string | null
}

export function ScorecardView({ scorecard, arsName }: ScorecardViewProps) {
  // Identifier le maillon faible
  const weakest = PILLARS.reduce((min, p) =>
    scorecard[p.key] < scorecard[min.key] ? p : min
  , PILLARS[0])

  const globalScore = Math.round(
    PILLARS.reduce((sum, p) => sum + scorecard[p.key], 0) / PILLARS.length
  )

  return (
    <div>
      {/* Score global */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-lg border border-ui-border bg-ui-bg">
        <div className="text-3xl font-medium text-ui-text-primary">{globalScore}%</div>
        <div>
          <p className="text-sm font-medium text-ui-text-primary">Score VALUE global</p>
          <p className="text-xs text-ui-text-secondary">{arsName ?? 'Votre ARS'}</p>
        </div>
      </div>

      {/* 5 piliers */}
      <div className="space-y-3">
        {PILLARS.map(pillar => {
          const score = scorecard[pillar.key]
          const isWeakest = pillar.key === weakest.key && score < 100
          const barColor = isWeakest ? 'bg-status-error' : score >= 70 ? 'bg-brand-green' : score >= 40 ? 'bg-yellow-500' : 'bg-status-error'

          return (
            <div
              key={pillar.key}
              className={`rounded-lg border p-4 transition-colors ${
                isWeakest ? 'border-status-error bg-red-50/50' : 'border-ui-border bg-ui-bg'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    isWeakest ? 'bg-status-error text-white' : 'bg-brand-violet-light text-brand-violet'
                  }`}>
                    {pillar.letter}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ui-text-primary">{pillar.label}</p>
                    <p className="text-xs text-ui-text-secondary">{pillar.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isWeakest && (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-status-error text-white">
                      Priorite VALUE Router
                    </span>
                  )}
                  <span className={`text-lg font-medium ${
                    isWeakest ? 'text-status-error' : 'text-ui-text-primary'
                  }`}>
                    {score}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-ui-bg-tertiary overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${Math.max(score, 2)}%` }}
                />
              </div>

              {/* Action prioritaire pour le maillon faible */}
              {isWeakest && (
                <p className="text-xs text-status-error mt-1">
                  Action prioritaire : {pillar.action}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
