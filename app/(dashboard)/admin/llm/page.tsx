'use client'

import { useEffect, useState, useCallback } from 'react'

type GroupBy = 'user' | 'model' | 'endpoint' | 'day'

interface UsageRow {
  userId?: string
  email?: string
  firstName?: string
  plan?: string
  model?: string
  endpoint?: string
  day?: string
  totalPromptTokens: number
  totalCompletionTokens: number
  totalCalls: number
}

interface ModelConfig {
  id: string
  plan: string
  purpose: string
  model: string
  maxTokensPerDay: number | null
  isActive: boolean
  updatedAt: string
}

interface AgentInstance {
  userId: string
  containerName: string
  port: number
  currentModel: string
}

const PLANS = ['starter', 'pro', 'business'] as const
const PURPOSES = ['generation', 'light', 'agent', 'fallback'] as const

export default function AdminLlmPage() {
  const [usageData, setUsageData] = useState<UsageRow[]>([])
  const [configs, setConfigs] = useState<ModelConfig[]>([])
  const [agents, setAgents] = useState<AgentInstance[]>([])
  const [groupBy, setGroupBy] = useState<GroupBy>('user')
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state for model config
  const [formPlan, setFormPlan] = useState<string>('starter')
  const [formPurpose, setFormPurpose] = useState<string>('generation')
  const [formModel, setFormModel] = useState('')
  const [formMaxTokens, setFormMaxTokens] = useState('')
  const [saving, setSaving] = useState(false)
  const [swapModels, setSwapModels] = useState<Record<string, string>>({})
  const [swapping, setSwapping] = useState<string | null>(null)

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/llm/swap-agent')
      if (!res.ok) return
      const json = await res.json()
      setAgents(json.agents)
    } catch {}
  }, [])

  const handleSwapModel = async (userId: string) => {
    const model = swapModels[userId]
    if (!model) return
    setSwapping(userId)
    try {
      const res = await fetch('/api/admin/llm/swap-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, model }),
      })
      if (res.ok) {
        setSwapModels(prev => ({ ...prev, [userId]: '' }))
        // Refresh after restart delay
        setTimeout(fetchAgents, 5000)
      }
    } finally { setSwapping(null) }
  }

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/llm/usage?days=${days}&groupBy=${groupBy}`)
      if (!res.ok) {
        const json = await res.json()
        setError(json.error || `Erreur ${res.status}`)
        return
      }
      const json = await res.json()
      setUsageData(json.data)
      setError(null)
    } catch { setError('Erreur de connexion') }
  }, [days, groupBy])

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/llm/models')
      if (!res.ok) return
      const json = await res.json()
      setConfigs(json.configs)
    } catch {}
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchUsage(), fetchConfigs(), fetchAgents()]).finally(() => setLoading(false))
  }, [fetchUsage, fetchConfigs, fetchAgents])

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/llm/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: formPlan,
          purpose: formPurpose,
          model: formModel,
          maxTokensPerDay: formMaxTokens ? Number(formMaxTokens) : null,
        }),
      })
      if (res.ok) {
        setFormModel('')
        setFormMaxTokens('')
        fetchConfigs()
      }
    } finally { setSaving(false) }
  }

  const handleDeleteConfig = async (id: string) => {
    await fetch('/api/admin/llm/models', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchConfigs()
  }

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  if (error === 'Acces refuse' || error === 'Accès refusé') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-status-error mb-2">Acces refuse</h1>
        <p className="text-ui-text-secondary">Cette page est reservee aux administrateurs.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-ui-text-primary">Admin — LLM Gateway</h1>

      {error && <div className="bg-status-error/10 border border-status-error/30 text-status-error px-4 py-2 rounded">{error}</div>}

      {/* ── Usage Section ── */}
      <section>
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold text-ui-text-primary">Consommation</h2>
          <select
            value={groupBy}
            onChange={e => setGroupBy(e.target.value as GroupBy)}
            className="rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text-primary"
          >
            <option value="user">Par utilisateur</option>
            <option value="model">Par modele</option>
            <option value="endpoint">Par endpoint</option>
            <option value="day">Par jour</option>
          </select>
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text-primary"
          >
            <option value={1}>24h</option>
            <option value={7}>7 jours</option>
            <option value={30}>30 jours</option>
            <option value={90}>90 jours</option>
          </select>
          <button
            onClick={() => { fetchUsage(); fetchConfigs() }}
            className="text-sm text-brand-violet hover:text-brand-violet-dark"
          >
            Rafraichir
          </button>
        </div>

        {loading ? (
          <p className="text-ui-text-tertiary">Chargement...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-ui-border text-left text-ui-text-secondary">
                  {groupBy === 'user' && <><th className="py-2 pr-4">Utilisateur</th><th className="py-2 pr-4">Plan</th></>}
                  {groupBy === 'model' && <th className="py-2 pr-4">Modele</th>}
                  {groupBy === 'endpoint' && <th className="py-2 pr-4">Endpoint</th>}
                  {groupBy === 'day' && <th className="py-2 pr-4">Date</th>}
                  <th className="py-2 pr-4">Prompt tokens</th>
                  <th className="py-2 pr-4">Completion tokens</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2">Appels</th>
                </tr>
              </thead>
              <tbody>
                {usageData.map((row, i) => (
                  <tr key={i} className="border-b border-ui-border hover:bg-ui-bg-secondary">
                    {groupBy === 'user' && (
                      <>
                        <td className="py-2 pr-4 text-ui-text-primary">{row.firstName || row.email}</td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            row.plan === 'business' ? 'bg-brand-violet-light text-brand-violet-dark' :
                            row.plan === 'pro' ? 'bg-status-info/10 text-brand-violet' :
                            'bg-ui-bg-tertiary text-ui-text-secondary'
                          }`}>{row.plan || 'aucun'}</span>
                        </td>
                      </>
                    )}
                    {groupBy === 'model' && <td className="py-2 pr-4 font-mono text-xs text-ui-text-primary">{row.model}</td>}
                    {groupBy === 'endpoint' && <td className="py-2 pr-4 text-ui-text-primary">{row.endpoint}</td>}
                    {groupBy === 'day' && <td className="py-2 pr-4 text-ui-text-primary">{row.day}</td>}
                    <td className="py-2 pr-4 tabular-nums text-ui-text-primary">{formatTokens(row.totalPromptTokens)}</td>
                    <td className="py-2 pr-4 tabular-nums text-ui-text-primary">{formatTokens(row.totalCompletionTokens)}</td>
                    <td className="py-2 pr-4 tabular-nums font-medium text-ui-text-primary">
                      {formatTokens(row.totalPromptTokens + row.totalCompletionTokens)}
                    </td>
                    <td className="py-2 tabular-nums text-ui-text-primary">{row.totalCalls}</td>
                  </tr>
                ))}
                {usageData.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-center text-ui-text-tertiary">Aucune donnee</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Model Config Section ── */}
      <section>
        <h2 className="text-lg font-semibold text-ui-text-primary mb-4">Configuration des modeles</h2>

        {/* Current configs */}
        {configs.length > 0 && (
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-ui-border text-left text-ui-text-secondary">
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4">Usage</th>
                  <th className="py-2 pr-4">Modele</th>
                  <th className="py-2 pr-4">Limite tokens/jour</th>
                  <th className="py-2 pr-4">Actif</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {configs.map(c => (
                  <tr key={c.id} className="border-b border-ui-border">
                    <td className="py-2 pr-4 capitalize text-ui-text-primary">{c.plan}</td>
                    <td className="py-2 pr-4 text-ui-text-primary">{c.purpose}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-ui-text-primary">{c.model}</td>
                    <td className="py-2 pr-4 tabular-nums text-ui-text-primary">{c.maxTokensPerDay ? formatTokens(c.maxTokensPerDay) : 'illimite'}</td>
                    <td className="py-2 pr-4 text-ui-text-primary">{c.isActive ? 'Oui' : 'Non'}</td>
                    <td className="py-2">
                      <button
                        onClick={() => handleDeleteConfig(c.id)}
                        className="text-status-error hover:text-status-error/80 text-xs"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/edit form */}
        <form onSubmit={handleSaveConfig} className="flex flex-wrap items-end gap-3 p-4 bg-ui-bg-secondary rounded-lg border border-ui-border">
          <div>
            <label className="block text-xs text-ui-text-secondary mb-1 font-medium">Plan</label>
            <select value={formPlan} onChange={e => setFormPlan(e.target.value)}
              className="rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text-primary">
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ui-text-secondary mb-1 font-medium">Usage</label>
            <select value={formPurpose} onChange={e => setFormPurpose(e.target.value)}
              className="rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text-primary">
              {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-ui-text-secondary mb-1 font-medium">Modele OpenRouter</label>
            <input
              value={formModel}
              onChange={e => setFormModel(e.target.value)}
              placeholder="anthropic/claude-sonnet-4-5"
              required
              className="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm font-mono text-ui-text-primary placeholder:text-ui-text-tertiary"
            />
          </div>
          <div>
            <label className="block text-xs text-ui-text-secondary mb-1 font-medium">Max tokens/jour</label>
            <input
              value={formMaxTokens}
              onChange={e => setFormMaxTokens(e.target.value)}
              placeholder="illimite"
              type="number"
              className="w-28 rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text-primary placeholder:text-ui-text-tertiary"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-violet hover:bg-brand-violet-dark disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm font-medium"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </section>

      {/* ── Active Agents Section ── */}
      <section>
        <h2 className="text-lg font-semibold text-ui-text-primary mb-4">Agents actifs</h2>

        {agents.length === 0 ? (
          <p className="text-ui-text-tertiary">Aucun agent en cours d'execution.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-ui-border text-left text-ui-text-secondary">
                  <th className="py-2 pr-4">Container</th>
                  <th className="py-2 pr-4">Port</th>
                  <th className="py-2 pr-4">Modele actuel</th>
                  <th className="py-2">Changer le modele</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agent => (
                  <tr key={agent.userId} className="border-b border-ui-border">
                    <td className="py-2 pr-4 font-mono text-xs text-ui-text-primary">{agent.containerName}</td>
                    <td className="py-2 pr-4 tabular-nums text-ui-text-primary">{agent.port}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-ui-text-primary">{agent.currentModel}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={swapModels[agent.userId] ?? ''}
                          onChange={e => setSwapModels(prev => ({ ...prev, [agent.userId]: e.target.value }))}
                          placeholder="nouveau modele"
                          className="flex-1 rounded-lg border border-ui-border bg-white px-3 py-1.5 text-sm font-mono text-ui-text-primary placeholder:text-ui-text-tertiary"
                        />
                        <button
                          onClick={() => handleSwapModel(agent.userId)}
                          disabled={!swapModels[agent.userId] || swapping === agent.userId}
                          className="bg-brand-green hover:bg-brand-green-dark disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap"
                        >
                          {swapping === agent.userId ? 'Swap...' : 'Swap'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
