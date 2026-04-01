'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface AgentStatus {
  provisioned: boolean
  status: string | null
  healthy: boolean
  containerId?: string | null
  hasToken?: boolean
  lastError?: string | null
}

type DeployStep = {
  label: string
  status: 'pending' | 'active' | 'done' | 'error'
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null)
  const [provisioning, setProvisioning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deploySteps, setDeploySteps] = useState<DeployStep[]>([])
  const [deployLogs, setDeployLogs] = useState<string[]>([])
  const [deployError, setDeployError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw/status')
      const data = await res.json()
      setAgentStatus(data)
      return data
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    Promise.all([
      checkStatus(),
      fetch('/api/chat').then(r => r.json()).then(d => setMessages(d.messages ?? [])),
    ]).finally(() => setLoading(false))
  }, [checkStatus])

  useEffect(scrollToBottom, [messages])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw/logs')
      const data = await res.json()
      if (data.logs) {
        const lines = data.logs.split('\n').filter((l: string) => l.trim())
        setDeployLogs(lines.slice(-10))
      }
      return data.status
    } catch {
      return null
    }
  }, [])

  const updateStep = (index: number, status: DeployStep['status']) => {
    setDeploySteps(prev => prev.map((s, i) => i === index ? { ...s, status } : s))
  }

  const handleProvision = async () => {
    setProvisioning(true)
    setDeployError(null)
    setDeploySteps([
      { label: 'Lancement du provisioning', status: 'active' },
      { label: 'Creation du workspace (AGENTS.md, SOUL.md)', status: 'pending' },
      { label: 'Demarrage du container Docker', status: 'pending' },
      { label: 'Initialisation OpenClaw (generation config)', status: 'pending' },
      { label: 'Configuration du modele LLM et reseau', status: 'pending' },
      { label: 'Redemarrage et verification de sante', status: 'pending' },
    ])

    try {
      const res = await fetch('/api/openclaw/provision', { method: 'POST' })
      const provisionData = await res.json()

      if (!res.ok) {
        setDeployError(provisionData.error || 'Erreur de provisioning')
        updateStep(0, 'error')
        setProvisioning(false)
        return
      }

      updateStep(0, 'done')
      updateStep(1, 'active')

      // Poll status — the provisioning runs server-side in background
      let attempts = 0
      const maxAttempts = 60 // 3 minutes max (provisioning takes ~60s)

      const poll = async () => {
        attempts++
        const status = await checkStatus()
        await fetchLogs()

        // Derive step from server state
        if (status?.provisioned && status?.containerId) {
          // Container exists
          updateStep(1, 'done')
          updateStep(2, 'done')

          if (status.hasToken) {
            // Config was read + token patched
            updateStep(3, 'done')
            updateStep(4, 'done')

            if (status.healthy) {
              // All done!
              updateStep(5, 'done')
              setProvisioning(false)
              return
            } else if (status.status === 'running') {
              updateStep(5, 'active')
            }
          } else {
            // Waiting for OpenClaw to generate config
            updateStep(3, 'active')
          }
        } else if (status?.provisioned) {
          // Instance in DB but no container yet
          updateStep(1, 'active')
        }

        if (status?.status === 'error') {
          setDeployError(status.lastError || 'Le container a rencontre une erreur.')
          setDeploySteps(prev => prev.map(s =>
            s.status === 'active' ? { ...s, status: 'error' } : s
          ))
          setProvisioning(false)
          return
        }

        if (attempts >= maxAttempts) {
          setDeployError('Timeout apres 3 minutes. Rafraichissez la page pour verifier l\'etat.')
          setDeploySteps(prev => prev.map(s =>
            s.status === 'active' ? { ...s, status: 'error' } : s
          ))
          setProvisioning(false)
          return
        }

        setTimeout(poll, 3000)
      }

      setTimeout(poll, 3000)
    } catch (e) {
      setDeployError(e instanceof Error ? e.message : 'Erreur inconnue')
      updateStep(0, 'error')
      setProvisioning(false)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      const data = await res.json()
      const assistantMsg: Message = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: res.ok ? data.response : `Erreur : ${data.error ?? 'Impossible de contacter l\'agent.'}`,
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Erreur de connexion. Verifiez que votre agent est en ligne.',
        createdAt: new Date().toISOString(),
      }])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isReady = agentStatus?.provisioned && agentStatus?.status === 'running' && agentStatus?.healthy

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-ui-text-tertiary">Chargement...</p>
      </div>
    )
  }

  // ─── Deploy screen ───────────────────────────────────────────────────────
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-brand-violet flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
              M
            </div>
            <h2 className="text-lg font-medium text-ui-text-primary mb-2">
              {provisioning ? 'Deploiement en cours...' : 'Deployer votre Agent MULTI'}
            </h2>
            <p className="text-sm text-ui-text-secondary">
              {provisioning
                ? 'Un container Docker isole est en cours de creation pour votre agent.'
                : 'Votre agent personnel sera deploye dans un environnement isole avec acces a votre BUSINESS.md et contexte.'}
            </p>
          </div>

          {/* Deploy steps */}
          {deploySteps.length > 0 && (
            <div className="mb-6 space-y-2">
              {deploySteps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {step.status === 'done' && (
                      <span className="text-brand-green text-sm">✓</span>
                    )}
                    {step.status === 'active' && (
                      <span className="w-3 h-3 rounded-full border-2 border-brand-violet border-t-transparent animate-spin" />
                    )}
                    {step.status === 'pending' && (
                      <span className="w-2 h-2 rounded-full bg-ui-bg-tertiary" />
                    )}
                    {step.status === 'error' && (
                      <span className="text-status-error text-sm">✗</span>
                    )}
                  </div>
                  <span className={`text-sm ${
                    step.status === 'active' ? 'text-ui-text-primary font-medium' :
                    step.status === 'done' ? 'text-brand-green' :
                    step.status === 'error' ? 'text-status-error' :
                    'text-ui-text-tertiary'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Live logs */}
          {deployLogs.length > 0 && (
            <div className="mb-6 rounded-lg bg-gray-900 p-3 overflow-hidden">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Container logs</p>
              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                {deployLogs.map((log, i) => (
                  <p key={i} className="text-[11px] font-mono text-gray-300 leading-tight truncate">
                    {log}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {deployError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-status-error">{deployError}</p>
            </div>
          )}

          {/* Action button */}
          {!provisioning && (
            <div className="text-center">
              <button
                onClick={handleProvision}
                className="px-6 py-2.5 rounded-lg bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet-dark transition-colors"
              >
                {deploySteps.length > 0 ? 'Reessayer le deploiement' : 'Deployer l\'agent'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Chat interface ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ui-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-violet flex items-center justify-center text-white text-xs font-bold">
            M
          </div>
          <div>
            <p className="text-sm font-medium text-ui-text-primary">Agent MULTI</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
              <span className="text-[10px] text-ui-text-tertiary">En ligne</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-ui-text-tertiary">
              Posez une question a votre agent. Il connait votre BUSINESS.md et peut vous aider
              a developper votre strategie.
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-brand-violet text-white rounded-br-md'
                  : 'bg-ui-bg-tertiary text-ui-text-primary rounded-bl-md'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <p className={`text-[10px] mt-1 ${
                msg.role === 'user' ? 'text-white/60' : 'text-ui-text-tertiary'
              }`}>
                {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-ui-bg-tertiary rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-ui-text-tertiary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-ui-text-tertiary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-ui-text-tertiary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-ui-border shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ecrivez un message..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-ui-border bg-ui-bg px-4 py-2.5 text-sm text-ui-text-primary placeholder:text-ui-text-tertiary focus:outline-none focus:border-brand-violet transition-colors"
            style={{ maxHeight: '120px' }}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 w-10 h-10 rounded-xl bg-brand-violet text-white flex items-center justify-center hover:bg-brand-violet-dark transition-colors disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
