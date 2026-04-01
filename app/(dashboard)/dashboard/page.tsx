'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ActionCard } from '@/components/dashboard/ActionCard'
import { AgentBriefing } from '@/components/dashboard/AgentBriefing'

type Period = 'today' | '7d' | '30d'
const PERIOD_LABELS: Record<Period, string> = {
  today: "Aujourd'hui",
  '7d': '7 jours',
  '30d': '30 jours',
}

interface DashboardAction {
  id: string
  actionType: string
  description: string
  status: 'pending' | 'approved' | 'modified' | 'rejected'
  agentSource: string | null
  createdAt: string
}

interface DashboardSummary {
  user: { plan: string | null; email: string; firstName: string | null } | null
  ars: { id: string; name: string; status: string; lastNightlyCycleAt: string | null } | null
  businessName: string | null
  sector: string | null
  metrics: {
    revenue: { value: number; variation: string; trend: 'up' | 'down' | 'neutral' }
    orders: { value: number; variation: string; trend: 'up' | 'down' | 'neutral' }
    satisfaction: { value: number; variation: string; trend: 'up' | 'down' | 'neutral' }
    traffic: { value: number; variation: string; trend: 'up' | 'down' | 'neutral' }
  }
  actions: DashboardAction[]
  briefing: string | null
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [period, setPeriod] = useState<Period>('today')
  const [loading, setLoading] = useState(true)

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/summary?period=${period}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  const handleDecision = async (actionId: string, decision: 'approved' | 'rejected') => {
    await fetch('/api/dashboard/actions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId, decision }),
    })
    // Rafraîchir les actions
    fetchSummary()
  }

  const hasArs = !!data?.ars
  const m = data?.metrics

  return (
    <div className="flex h-full">
      {/* Colonne principale */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-medium text-ui-text-primary mb-0.5">Dashboard</h1>
            <p className="text-sm text-ui-text-secondary">
              {data?.businessName ? `${data.businessName} — ${data.sector}` : 'Vue d\'ensemble de votre ARS'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Indicateur ARS actif */}
            {hasArs && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-green-light border border-brand-green">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                <span className="text-xs font-medium text-brand-green-dark">ARS actif</span>
              </div>
            )}
            {/* Sélecteur de période */}
            <div className="flex rounded-lg border border-ui-border overflow-hidden">
              {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    period === p
                      ? 'bg-brand-violet text-white font-medium'
                      : 'bg-ui-bg text-ui-text-secondary hover:bg-ui-bg-tertiary'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-ui-text-tertiary">Chargement...</p>
        ) : (
          <>
            {/* 4 Metric Cards VALUE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard
                label="Revenu"
                value={m ? `${m.revenue.value.toLocaleString('fr-FR')}€` : '--'}
                variation={m?.revenue.variation}
                trend={m?.revenue.trend}
                sub="Ce mois"
              />
              <MetricCard
                label="Commandes"
                value={m ? String(m.orders.value) : '--'}
                variation={m?.orders.variation}
                trend={m?.orders.trend}
                sub="Nouvelles commandes"
              />
              <MetricCard
                label="Satisfaction"
                value={m ? `${m.satisfaction.value}%` : '--'}
                variation={m?.satisfaction.variation}
                trend={m?.satisfaction.trend}
                sub="Score moyen"
              />
              <MetricCard
                label="Trafic"
                value={m ? String(m.traffic.value) : '--'}
                variation={m?.traffic.variation}
                trend={m?.traffic.trend}
                sub="Visiteurs uniques"
              />
            </div>

            {/* Section Actions de cette nuit */}
            <div className="mb-8">
              <h2 className="text-md font-medium text-ui-text-primary mb-3">
                Actions de cette nuit
              </h2>
              {data?.actions && data.actions.length > 0 ? (
                <div className="space-y-2">
                  {data.actions.map(action => (
                    <ActionCard
                      key={action.id}
                      {...action}
                      onDecision={handleDecision}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-ui-border bg-ui-bg-secondary p-6 text-center">
                  <p className="text-sm text-ui-text-tertiary">
                    {hasArs
                      ? 'Aucune action nocturne pour cette periode. Le prochain cycle demarre a 2h.'
                      : 'Les actions apparaitront ici apres le premier cycle nocturne de votre ARS.'}
                  </p>
                </div>
              )}
            </div>

            {/* Accès rapides */}
            {!hasArs && data?.user && (
              <div className="rounded-lg border border-ui-border bg-ui-bg-secondary p-6">
                <h2 className="text-md font-medium text-ui-text-primary mb-2">Commencez ici</h2>
                <p className="text-sm text-ui-text-secondary mb-4">
                  Repondez aux 12 questions du wizard pour generer votre BUSINESS.md et activer votre ARS.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet-dark transition-colors"
                >
                  Lancer le wizard
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* Colonne droite — Agent Briefing */}
      <aside className="hidden lg:block w-72 shrink-0 border-l border-ui-border bg-ui-bg-secondary">
        <AgentBriefing
          briefing={data?.briefing ?? null}
          arsName={data?.ars?.name ?? data?.businessName ?? null}
          arsStatus={data?.ars?.status ?? null}
          plan={data?.user?.plan ?? null}
        />
      </aside>
    </div>
  )
}
