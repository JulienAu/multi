'use client'

import { useEffect, useState } from 'react'
import { ScorecardView } from '@/components/dashboard/ScorecardView'

interface ScorecardResponse {
  scorecard: {
    value: number
    acquisition: number
    leverage: number
    uptake: number
    enhancement: number
  } | null
  arsId: string | null
  arsName: string | null
  lastCycleAt: string | null
}

export default function ScorecardPage() {
  const [data, setData] = useState<ScorecardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/scorecard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const hasScorecard = data?.scorecard && data.arsId

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-ui-text-primary mb-0.5">Scorecard VALUE</h1>
        <p className="text-sm text-ui-text-secondary">
          {hasScorecard
            ? `Performance de votre ARS — ${data!.arsName}`
            : 'Les 5 piliers de performance de votre ARS'}
        </p>
        {data?.lastCycleAt && (
          <p className="text-xs text-ui-text-tertiary mt-1">
            Dernier cycle : {new Date(data.lastCycleAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {loading && (
        <p className="text-sm text-ui-text-tertiary">Chargement...</p>
      )}

      {!loading && hasScorecard && (
        <ScorecardView
          scorecard={data!.scorecard!}
          arsName={data!.arsName}
        />
      )}

      {!loading && !hasScorecard && (
        <div className="rounded-lg border border-ui-border bg-ui-bg-secondary p-6 text-center">
          <p className="text-sm text-ui-text-secondary">
            {data?.arsId
              ? 'La scorecard sera alimentee apres le premier cycle nocturne de votre ARS.'
              : 'Aucun ARS actif. Completez le wizard et activez un plan pour deployer votre ARS.'}
          </p>
        </div>
      )}
    </div>
  )
}
