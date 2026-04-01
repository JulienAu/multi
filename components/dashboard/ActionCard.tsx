'use client'

import { useState } from 'react'

interface ActionCardProps {
  id: string
  actionType: string
  description: string
  agentSource: string | null
  status: 'pending' | 'approved' | 'modified' | 'rejected'
  createdAt: string
  onDecision: (id: string, decision: 'approved' | 'rejected') => void
}

const STATUS_STYLES = {
  pending: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  approved: 'bg-green-50 border-green-200 text-green-800',
  modified: 'bg-blue-50 border-blue-200 text-blue-800',
  rejected: 'bg-red-50 border-red-200 text-red-800',
}

const STATUS_LABELS = {
  pending: 'A valider',
  approved: 'Approuve',
  modified: 'Modifie',
  rejected: 'Refuse',
}

const AGENT_ICONS: Record<string, string> = {
  marketing: '◆',
  engineering: '⚙',
  support: '◎',
  ceo: '★',
}

export function ActionCard({ id, actionType, description, agentSource, status, createdAt, onDecision }: ActionCardProps) {
  const [deciding, setDeciding] = useState(false)
  const isPending = status === 'pending'
  const time = new Date(createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    setDeciding(true)
    await onDecision(id, decision)
    setDeciding(false)
  }

  return (
    <div className={`rounded-lg border p-3 ${isPending ? 'border-yellow-200 bg-yellow-50/50' : 'border-ui-border bg-ui-bg'}`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-ui-text-tertiary">{AGENT_ICONS[agentSource ?? ''] ?? '●'}</span>
          <span className="text-sm font-medium text-ui-text-primary truncate">{actionType}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-ui-text-tertiary">{time}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      </div>
      <p className="text-xs text-ui-text-secondary mb-2">{description}</p>
      {isPending && (
        <div className="flex gap-2">
          <button
            onClick={() => handleDecision('approved')}
            disabled={deciding}
            className="px-3 py-1 text-xs font-medium rounded-md bg-brand-green text-white hover:bg-brand-green-dark transition-colors disabled:opacity-50"
          >
            OUI
          </button>
          <button
            onClick={() => handleDecision('rejected')}
            disabled={deciding}
            className="px-3 py-1 text-xs font-medium rounded-md border border-ui-border text-ui-text-secondary hover:bg-ui-bg-tertiary transition-colors disabled:opacity-50"
          >
            REFUSER
          </button>
        </div>
      )}
    </div>
  )
}
