'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  createdAt: string
}

interface ToolRequest {
  id: string
  toolType: 'exec' | 'plugin'
  command?: string
  title?: string
  description?: string
  status: 'pending' | 'resolved'
  decision?: string
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
  const [toolRequests, setToolRequests] = useState<Map<string, ToolRequest>>(new Map())
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [autoApprove, setAutoApprove] = useState(false)
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null)
  const [provisioning, setProvisioning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deploySteps, setDeploySteps] = useState<DeployStep[]>([])
  const [deployLogs, setDeployLogs] = useState<string[]>([])
  const [deployError, setDeployError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const currentAssistantId = useRef<string | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw/status')
      return await res.json()
    } catch { return null }
  }, [])

  useEffect(() => {
    Promise.all([
      checkStatus().then(setAgentStatus),
      fetch('/api/chat').then(r => r.json()).then(d => setMessages(d.messages ?? [])),
      fetch('/api/chat/auto-approve').then(r => r.json()).then(d => setAutoApprove(d.autoApprove ?? false)),
    ]).finally(() => setLoading(false))
  }, [checkStatus])

  useEffect(scrollToBottom, [messages, toolRequests])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw/logs')
      const data = await res.json()
      if (data.logs) {
        setDeployLogs(data.logs.split('\n').filter((l: string) => l.trim()).slice(-10))
      }
    } catch { /* ignore */ }
  }, [])

  const updateStep = (index: number, status: DeployStep['status']) => {
    setDeploySteps(prev => prev.map((s, i) => i === index ? { ...s, status } : s))
  }

  // ─── Auto-approve toggle ──────────────────────────────────────────────
  const toggleAutoApprove = async () => {
    const newVal = !autoApprove
    setAutoApprove(newVal)
    await fetch('/api/chat/auto-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: newVal }),
    })
  }

  // ─── Tool approval ────────────────────────────────────────────────────
  const handleApproval = async (openclawId: string, decision: 'allow-once' | 'allow-always' | 'deny') => {
    try {
      await fetch('/api/chat/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openclawId, decision }),
      })
      setToolRequests(prev => {
        const next = new Map(prev)
        const req = next.get(openclawId)
        if (req) next.set(openclawId, { ...req, status: 'resolved', decision })
        return next
      })
    } catch (e) {
      console.error('Approval failed', e)
    }
  }

  // ─── Provisioning ─────────────────────────────────────────────────────
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
      if (!res.ok) {
        const data = await res.json()
        setDeployError(data.error || 'Erreur')
        updateStep(0, 'error')
        setProvisioning(false)
        return
      }
      updateStep(0, 'done')
      updateStep(1, 'active')

      let attempts = 0
      const poll = async () => {
        attempts++
        const status = await checkStatus()
        setAgentStatus(status)
        await fetchLogs()

        if (status?.provisioned && status?.containerId) {
          updateStep(1, 'done')
          updateStep(2, 'done')
          if (status.hasToken) {
            updateStep(3, 'done')
            updateStep(4, 'done')
            if (status.healthy) {
              updateStep(5, 'done')
              setProvisioning(false)
              return
            }
            updateStep(5, 'active')
          } else {
            updateStep(3, 'active')
          }
        } else if (status?.provisioned) {
          updateStep(1, 'active')
        }

        if (status?.status === 'error') {
          setDeployError(status.lastError || 'Erreur du container')
          setDeploySteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s))
          setProvisioning(false)
          return
        }

        if (attempts >= 60) {
          setDeployError('Timeout apres 3 minutes.')
          setDeploySteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s))
          setProvisioning(false)
          return
        }

        setTimeout(poll, 3000)
      }
      setTimeout(poll, 3000)
    } catch (e) {
      setDeployError(e instanceof Error ? e.message : 'Erreur')
      updateStep(0, 'error')
      setProvisioning(false)
    }
  }

  // ─── Send message (streaming + tool events) ───────────────────────────
  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }])
    setInput('')
    setSending(true)

    const assistantId = `asst-${Date.now()}`
    currentAssistantId.current = assistantId

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (!res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, {
          id: assistantId, role: 'assistant',
          content: `Erreur : ${data.error ?? 'Agent inaccessible.'}`,
          createdAt: new Date().toISOString(),
        }])
        return
      }

      // Start with empty assistant bubble
      setMessages(prev => [...prev, {
        id: assistantId, role: 'assistant', content: '',
        createdAt: new Date().toISOString(),
      }])

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue

          try {
            const event = JSON.parse(raw)

            if (event.type === 'delta' && event.content) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + event.content } : m
              ))
            }

            if (event.type === 'tool_request') {
              setToolRequests(prev => {
                const next = new Map(prev)
                next.set(event.id, {
                  id: event.id,
                  toolType: event.toolType,
                  command: event.command,
                  title: event.title,
                  description: event.description,
                  status: 'pending',
                })
                return next
              })
            }

            if (event.type === 'tool_resolved') {
              setToolRequests(prev => {
                const next = new Map(prev)
                const req = next.get(event.id)
                if (req) next.set(event.id, { ...req, status: 'resolved', decision: event.decision })
                return next
              })
            }

            if (event.type === 'error') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId && !m.content
                  ? { ...m, content: `Erreur : ${event.error}` }
                  : m
              ))
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(prev => {
        const existing = prev.find(m => m.id === assistantId)
        if (existing?.content) return prev
        return [...prev.filter(m => m.id !== assistantId), {
          id: assistantId, role: 'assistant' as const,
          content: 'Erreur de connexion.',
          createdAt: new Date().toISOString(),
        }]
      })
    } finally {
      setSending(false)
      currentAssistantId.current = null
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const isReady = agentStatus?.provisioned && agentStatus?.status === 'running' && agentStatus?.healthy

  if (loading) return <div className="flex items-center justify-center h-full"><p className="text-sm text-ui-text-tertiary">Chargement...</p></div>

  // ─── Deploy screen ────────────────────────────────────────────────────
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-brand-violet flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">M</div>
            <h2 className="text-lg font-medium text-ui-text-primary mb-2">
              {provisioning ? 'Deploiement en cours...' : 'Deployer votre Agent MULTI'}
            </h2>
            <p className="text-sm text-ui-text-secondary">
              {provisioning
                ? 'Un container Docker isole est en cours de creation.'
                : 'Votre agent personnel sera deploye dans un environnement isole avec acces a votre BUSINESS.md.'}
            </p>
          </div>

          {deploySteps.length > 0 && (
            <div className="mb-6 space-y-2">
              {deploySteps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {step.status === 'done' && <span className="text-brand-green text-sm">✓</span>}
                    {step.status === 'active' && <span className="w-3 h-3 rounded-full border-2 border-brand-violet border-t-transparent animate-spin" />}
                    {step.status === 'pending' && <span className="w-2 h-2 rounded-full bg-ui-bg-tertiary" />}
                    {step.status === 'error' && <span className="text-status-error text-sm">✗</span>}
                  </div>
                  <span className={`text-sm ${
                    step.status === 'active' ? 'text-ui-text-primary font-medium' :
                    step.status === 'done' ? 'text-brand-green' :
                    step.status === 'error' ? 'text-status-error' : 'text-ui-text-tertiary'
                  }`}>{step.label}</span>
                </div>
              ))}
            </div>
          )}

          {deployLogs.length > 0 && (
            <div className="mb-6 rounded-lg bg-gray-900 p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Container logs</p>
              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                {deployLogs.map((log, i) => <p key={i} className="text-[11px] font-mono text-gray-300 leading-tight truncate">{log}</p>)}
              </div>
            </div>
          )}

          {deployError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-status-error">{deployError}</p>
            </div>
          )}

          {!provisioning && (
            <div className="text-center">
              <button onClick={handleProvision} className="px-6 py-2.5 rounded-lg bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet-dark transition-colors">
                {deploySteps.length > 0 ? 'Reessayer' : 'Deployer l\'agent'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Chat interface ───────────────────────────────────────────────────
  const pendingTools = Array.from(toolRequests.values()).filter(t => t.status === 'pending')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ui-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-violet flex items-center justify-center text-white text-xs font-bold">M</div>
          <div>
            <p className="text-sm font-medium text-ui-text-primary">Agent MULTI</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
              <span className="text-[10px] text-ui-text-tertiary">En ligne — WebSocket</span>
            </div>
          </div>
        </div>
        {/* Auto-approve toggle */}
        <button
          onClick={toggleAutoApprove}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            autoApprove
              ? 'bg-brand-green-light text-brand-green-dark border border-brand-green'
              : 'bg-ui-bg-tertiary text-ui-text-secondary border border-ui-border hover:bg-ui-bg'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${autoApprove ? 'bg-brand-green' : 'bg-ui-text-tertiary'}`} />
          {autoApprove ? 'Auto-approve ON' : 'Auto-approve OFF'}
        </button>
      </div>

      {/* Pending tool approvals banner */}
      {pendingTools.length > 0 && (
        <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-2 space-y-2">
          <p className="text-xs font-medium text-yellow-800">
            {pendingTools.length} action{pendingTools.length > 1 ? 's' : ''} en attente de validation
          </p>
          {pendingTools.map(tool => (
            <div key={tool.id} className="flex items-center justify-between gap-3 p-2 rounded-md bg-white border border-yellow-200">
              <div className="min-w-0">
                <p className="text-xs font-medium text-ui-text-primary truncate">
                  {tool.toolType === 'exec' ? '$ ' : ''}{tool.command || tool.title || tool.description}
                </p>
                <p className="text-[10px] text-ui-text-tertiary">{tool.toolType === 'exec' ? 'Commande shell' : 'Plugin'}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => handleApproval(tool.id, 'allow-once')}
                  className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-brand-green text-white hover:bg-brand-green-dark"
                >
                  Approuver
                </button>
                <button
                  onClick={() => handleApproval(tool.id, 'allow-always')}
                  className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-brand-violet text-white hover:bg-brand-violet-dark"
                >
                  Toujours
                </button>
                <button
                  onClick={() => handleApproval(tool.id, 'deny')}
                  className="px-2.5 py-1 text-[10px] font-medium rounded-md border border-ui-border text-ui-text-secondary hover:bg-ui-bg-tertiary"
                >
                  Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-ui-text-tertiary">
              Posez une question ou demandez une tache a votre agent.
              Il peut creer des fichiers, executer des commandes, et plus encore.
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              msg.role === 'user'
                ? 'bg-brand-violet text-white rounded-br-md'
                : 'bg-ui-bg-tertiary text-ui-text-primary rounded-bl-md'
            }`}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              {msg.content && (
                <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-ui-text-tertiary'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        ))}

        {sending && !messages.find(m => m.id === currentAssistantId.current && m.content) && (
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
            placeholder="Ecrivez un message ou demandez une tache..."
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
