'use client'

import { useEffect, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AGENT_TEMPLATES, DAYS_OF_WEEK, buildCronExpression } from '@/lib/agents/templates'
import type { AgentTemplate } from '@/lib/agents/templates'

interface AgentRun {
  id: string
  status: string
  output: string | null
  startedAt: string
  completedAt: string | null
}

interface AgentJob {
  id: string
  name: string
  icon: string
  description: string
  schedule: string
  scheduleHuman: string | null
  requiresApproval: boolean
  status: string
  templateId: string | null
  lastRunAt: string | null
  createdAt: string
  lastRun: AgentRun | null
}

type View = 'list' | 'create-pick' | 'create-form' | 'detail'

export default function AgentsPage() {
  const [jobs, setJobs] = useState<AgentJob[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [selectedJob, setSelectedJob] = useState<AgentJob | null>(null)
  const [detailRuns, setDetailRuns] = useState<AgentRun[]>([])

  // Create form state
  const [formTemplate, setFormTemplate] = useState<AgentTemplate | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formScheduleType, setFormScheduleType] = useState<'daily' | 'specific_days'>('daily')
  const [formHour, setFormHour] = useState(9)
  const [formMinute, setFormMinute] = useState(0)
  const [formDays, setFormDays] = useState<string[]>(['1'])
  const [formApproval, setFormApproval] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/agents')
      if (res.ok) {
        const data = await res.json()
        setJobs(data.jobs)
      }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const openDetail = async (job: AgentJob) => {
    setSelectedJob(job)
    setView('detail')
    try {
      const res = await fetch(`/api/agents/${job.id}`)
      if (res.ok) {
        const data = await res.json()
        setDetailRuns(data.runs)
      }
    } catch {}
  }

  const startCreate = (template: AgentTemplate | null) => {
    if (template) {
      setFormTemplate(template)
      setFormName(template.name)
      setFormDescription(template.prompt)
      setFormApproval(template.requiresApproval)
      // Parse schedule from template
      const parts = template.schedule.split(' ')
      setFormMinute(Number(parts[0]))
      setFormHour(Number(parts[1]))
      const daysPart = parts[4]
      if (daysPart === '*') {
        setFormScheduleType('daily')
      } else {
        setFormScheduleType('specific_days')
        setFormDays(daysPart.split(','))
      }
    } else {
      setFormTemplate(null)
      setFormName('')
      setFormDescription('')
      setFormApproval(true)
      setFormScheduleType('daily')
      setFormHour(9)
      setFormMinute(0)
      setFormDays(['1'])
    }
    setView('create-form')
  }

  const handleCreate = async () => {
    setSaving(true)
    const { cron, human } = buildCronExpression(formScheduleType, formHour, formMinute, formDays)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: formTemplate?.id,
          name: formName,
          icon: formTemplate?.icon,
          description: formDescription,
          schedule: cron,
          scheduleHuman: human,
          requiresApproval: formApproval,
        }),
      })
      if (res.ok) {
        setView('list')
        fetchJobs()
      }
    } finally { setSaving(false) }
  }

  const handleToggle = async (job: AgentJob) => {
    const newStatus = job.status === 'active' ? 'paused' : 'active'
    await fetch(`/api/agents/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchJobs()
  }

  const handleDelete = async (job: AgentJob) => {
    if (!confirm(`Supprimer l'agent "${job.name}" ?`)) return
    await fetch(`/api/agents/${job.id}`, { method: 'DELETE' })
    setView('list')
    fetchJobs()
  }

  const handleRunNow = async (job: AgentJob) => {
    setRunning(job.id)
    try {
      await fetch(`/api/agents/${job.id}/run`, { method: 'POST' })
      // Refresh detail + list
      if (selectedJob?.id === job.id) openDetail(job)
      fetchJobs()
    } finally { setRunning(null) }
  }

  const handleDecision = async (runId: string, decision: 'approved' | 'rejected') => {
    await fetch(`/api/agents/runs/${runId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    })
    if (selectedJob) openDetail(selectedJob)
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-brand-green-light text-brand-green-dark',
      paused: 'bg-ui-bg-tertiary text-ui-text-secondary',
      running: 'bg-status-warning/10 text-status-warning',
      completed: 'bg-brand-green-light text-brand-green-dark',
      failed: 'bg-status-error/10 text-status-error',
      pending_approval: 'bg-brand-violet-light text-brand-violet',
      approved: 'bg-brand-green-light text-brand-green-dark',
      rejected: 'bg-status-error/10 text-status-error',
    }
    const labels: Record<string, string> = {
      active: 'Actif', paused: 'En pause', running: 'En cours',
      completed: 'Termine', failed: 'Echoue',
      pending_approval: 'A valider', approved: 'Approuve', rejected: 'Rejete',
    }
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] ?? 'bg-ui-bg-tertiary text-ui-text-secondary'}`}>{labels[status] ?? status}</span>
  }

  if (loading) return <div className="p-6"><p className="text-sm text-ui-text-tertiary">Chargement...</p></div>

  // ── Detail view ──
  if (view === 'detail' && selectedJob) {
    return (
      <div className="p-6 max-w-4xl">
        <button onClick={() => setView('list')} className="text-sm text-brand-violet hover:text-brand-violet-dark mb-4">← Retour</button>
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{selectedJob.icon}</span>
            <div>
              <h1 className="text-xl font-medium text-ui-text-primary">{selectedJob.name}</h1>
              <p className="text-sm text-ui-text-secondary">{selectedJob.scheduleHuman} {statusBadge(selectedJob.status)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleRunNow(selectedJob)} disabled={running === selectedJob.id} className="px-3 py-1.5 rounded-lg bg-brand-violet text-white text-sm hover:bg-brand-violet-dark disabled:opacity-70">
              {running === selectedJob.id ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Execution en cours...
                </span>
              ) : 'Lancer maintenant'}
            </button>
            <button onClick={() => handleToggle(selectedJob)} className="px-3 py-1.5 rounded-lg border border-ui-border text-sm text-ui-text-secondary hover:bg-ui-bg-tertiary">
              {selectedJob.status === 'active' ? 'Mettre en pause' : 'Reactiver'}
            </button>
            <button onClick={() => handleDelete(selectedJob)} className="px-3 py-1.5 rounded-lg border border-status-error/30 text-sm text-status-error hover:bg-status-error/5">Supprimer</button>
          </div>
        </div>

        <div className="mb-6 p-4 bg-ui-bg-secondary rounded-lg border border-ui-border">
          <p className="text-xs text-ui-text-secondary mb-1 font-medium">Instructions</p>
          <p className="text-sm text-ui-text-primary whitespace-pre-wrap">{selectedJob.description}</p>
        </div>

        <h2 className="text-lg font-medium text-ui-text-primary mb-3">Historique des executions</h2>
        {detailRuns.length === 0 ? (
          <p className="text-sm text-ui-text-tertiary">Aucune execution pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {detailRuns.map(run => (
              <div key={run.id} className="rounded-lg border border-ui-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {statusBadge(run.status)}
                    <span className="text-xs text-ui-text-tertiary">{new Date(run.startedAt).toLocaleString('fr-FR')}</span>
                  </div>
                  {run.status === 'pending_approval' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleDecision(run.id, 'approved')} className="px-3 py-1 rounded bg-brand-green text-white text-xs hover:bg-brand-green-dark">Approuver</button>
                      <button onClick={() => handleDecision(run.id, 'rejected')} className="px-3 py-1 rounded bg-status-error text-white text-xs hover:bg-status-error/80">Rejeter</button>
                    </div>
                  )}
                </div>
                {run.output && (
                  <div className="text-sm text-ui-text-primary prose-chat mt-2 p-3 bg-ui-bg rounded-lg">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{run.output}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Template picker ──
  if (view === 'create-pick') {
    return (
      <div className="p-6 max-w-4xl">
        <button onClick={() => setView('list')} className="text-sm text-brand-violet hover:text-brand-violet-dark mb-4">← Retour</button>
        <h1 className="text-xl font-medium text-ui-text-primary mb-1">Creer un agent</h1>
        <p className="text-sm text-ui-text-secondary mb-6">Choisissez un modele ou creez un agent personnalise.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {AGENT_TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => startCreate(tpl)}
              className="text-left p-4 rounded-lg border border-ui-border hover:border-brand-violet hover:bg-brand-violet-light/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xl">{tpl.icon}</span>
                <span className="font-medium text-sm text-ui-text-primary">{tpl.name}</span>
              </div>
              <p className="text-xs text-ui-text-secondary mb-2">{tpl.description}</p>
              <p className="text-xs text-ui-text-tertiary">{tpl.scheduleHuman}</p>
            </button>
          ))}
        </div>

        <button
          onClick={() => startCreate(null)}
          className="w-full p-4 rounded-lg border border-dashed border-ui-border-strong text-sm text-ui-text-secondary hover:border-brand-violet hover:text-brand-violet transition-colors"
        >
          + Agent personnalise
        </button>
      </div>
    )
  }

  // ── Create form ──
  if (view === 'create-form') {
    return (
      <div className="p-6 max-w-2xl">
        <button onClick={() => setView('create-pick')} className="text-sm text-brand-violet hover:text-brand-violet-dark mb-4">← Retour</button>
        <h1 className="text-xl font-medium text-ui-text-primary mb-6">
          {formTemplate ? `Configurer : ${formTemplate.name}` : 'Agent personnalise'}
        </h1>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-ui-text-primary mb-1">Nom de l'agent</label>
            <input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Ex: Marketing Instagram"
              className="w-full rounded-lg border border-ui-border bg-white px-4 py-2.5 text-sm text-ui-text-primary placeholder:text-ui-text-tertiary focus:border-brand-violet focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ui-text-primary mb-1">Que doit faire cet agent ?</label>
            <textarea
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              rows={formTemplate ? 4 : 6}
              placeholder="Decrivez en langage naturel ce que l'agent doit faire a chaque execution..."
              className="w-full rounded-lg border border-ui-border bg-white px-4 py-2.5 text-sm text-ui-text-primary placeholder:text-ui-text-tertiary focus:border-brand-violet focus:outline-none resize-y"
            />
            {formTemplate && <p className="text-xs text-ui-text-tertiary mt-1">Pre-rempli depuis le modele. Vous pouvez le modifier.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-ui-text-primary mb-2">Frequence</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setFormScheduleType('daily')}
                className={`px-3 py-1.5 rounded-lg text-sm border ${formScheduleType === 'daily' ? 'border-brand-violet bg-brand-violet-light text-brand-violet font-medium' : 'border-ui-border text-ui-text-secondary'}`}
              >Chaque jour</button>
              <button
                onClick={() => setFormScheduleType('specific_days')}
                className={`px-3 py-1.5 rounded-lg text-sm border ${formScheduleType === 'specific_days' ? 'border-brand-violet bg-brand-violet-light text-brand-violet font-medium' : 'border-ui-border text-ui-text-secondary'}`}
              >Jours specifiques</button>
            </div>

            {formScheduleType === 'specific_days' && (
              <div className="flex gap-1.5 mb-3">
                {DAYS_OF_WEEK.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setFormDays(prev => prev.includes(d.value) ? prev.filter(v => v !== d.value) : [...prev, d.value])}
                    className={`w-10 h-10 rounded-lg text-xs font-medium border ${formDays.includes(d.value) ? 'border-brand-violet bg-brand-violet text-white' : 'border-ui-border text-ui-text-secondary hover:bg-ui-bg-tertiary'}`}
                  >{d.label}</button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm text-ui-text-secondary">a</span>
              <select
                value={formHour}
                onChange={e => setFormHour(Number(e.target.value))}
                className="rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text-primary"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}h</option>
                ))}
              </select>
              <select
                value={formMinute}
                onChange={e => setFormMinute(Number(e.target.value))}
                className="rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-text-primary"
              >
                {[0, 15, 30, 45].map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setFormApproval(!formApproval)}
              className={`relative w-11 h-6 rounded-full transition-colors ${formApproval ? 'bg-brand-violet' : 'bg-ui-border-strong'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${formApproval ? 'translate-x-5' : ''}`} />
            </button>
            <div>
              <p className="text-sm text-ui-text-primary">Validation manuelle</p>
              <p className="text-xs text-ui-text-tertiary">{formApproval ? 'Vous validez chaque resultat avant publication' : 'Les resultats sont automatiquement approuves'}</p>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={saving || !formName.trim() || !formDescription.trim()}
            className="w-full py-3 rounded-lg bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet-dark disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creation en cours...' : 'Creer l\'agent'}
          </button>
        </div>
      </div>
    )
  }

  // ── List view ──
  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-ui-text-primary mb-1">Agents</h1>
          <p className="text-sm text-ui-text-secondary">Vos agents IA et leurs missions recurrentes</p>
        </div>
        <button
          onClick={() => setView('create-pick')}
          className="px-4 py-2 rounded-lg bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet-dark transition-colors"
        >
          + Creer un agent
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ui-border-strong p-12 text-center">
          <p className="text-3xl mb-3">🤖</p>
          <p className="text-sm font-medium text-ui-text-primary mb-1">Aucun agent actif</p>
          <p className="text-xs text-ui-text-secondary mb-4">Creez votre premier agent pour automatiser des taches recurrentes.</p>
          <button
            onClick={() => setView('create-pick')}
            className="px-4 py-2 rounded-lg bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet-dark"
          >
            Creer un agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {jobs.map(job => (
            <div
              key={job.id}
              onClick={() => openDetail(job)}
              className="p-4 rounded-lg border border-ui-border hover:border-brand-violet/50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{job.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-ui-text-primary">{job.name}</p>
                    <p className="text-xs text-ui-text-tertiary">{job.scheduleHuman}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {statusBadge(job.status)}
                  <button
                    onClick={() => handleToggle(job)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${job.status === 'active' ? 'bg-brand-green' : 'bg-ui-border-strong'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${job.status === 'active' ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              </div>

              {job.lastRun && (
                <div className="mt-2 pt-2 border-t border-ui-border">
                  <div className="flex items-center gap-2">
                    {statusBadge(job.lastRun.status)}
                    <span className="text-xs text-ui-text-tertiary">
                      {new Date(job.lastRun.startedAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {job.lastRun.output && (
                    <p className="text-xs text-ui-text-secondary mt-1 line-clamp-2">{job.lastRun.output.slice(0, 150)}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
