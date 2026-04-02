'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface Conversation {
  id: string
  title: string
  lastMessageAt: string | null
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

type DeployStep = { label: string; status: 'pending' | 'active' | 'done' | 'error' }

export function ChatInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null)
  const [provisioning, setProvisioning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deploySteps, setDeploySteps] = useState<DeployStep[]>([])
  const [deployLogs, setDeployLogs] = useState<string[]>([])
  const [deployError, setDeployError] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [attachments, setAttachments] = useState<{ path: string; name: string; type: string; dataUrl?: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentAssistantId = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  const checkStatus = useCallback(async () => {
    try { const r = await fetch('/api/openclaw/status'); return await r.json() } catch { return null }
  }, [])

  const fetchConversations = useCallback(async (query?: string) => {
    try {
      const url = query ? `/api/conversations?q=${encodeURIComponent(query)}` : '/api/conversations'
      const r = await fetch(url)
      const d = await r.json()
      setConversations(d.conversations ?? [])
      return d.conversations ?? []
    } catch { return [] }
  }, [])

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const r = await fetch(`/api/chat?conversationId=${convId}`)
      const d = await r.json()
      setMessages(d.messages ?? [])
    } catch { setMessages([]) }
  }, [])

  // Init
  useEffect(() => {
    Promise.all([
      checkStatus().then(setAgentStatus),
      fetchConversations(),
    ]).then(([, convs]) => {
      // Auto-select most recent conversation
      if (convs && convs.length > 0) {
        setActiveConvId(convs[0].id)
        loadMessages(convs[0].id)
      }
      setLoading(false)
    })
  }, [checkStatus, fetchConversations, loadMessages])

  useEffect(scrollToBottom, [messages])

  // Timer
  useEffect(() => {
    if (sending) {
      setElapsedSeconds(0)
      timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setElapsedSeconds(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [sending])

  const fetchLogs = useCallback(async () => {
    try { const r = await fetch('/api/openclaw/logs'); const d = await r.json(); if (d.logs) setDeployLogs(d.logs.split('\n').filter((l: string) => l.trim()).slice(-10)) } catch {}
  }, [])

  const updateStep = (i: number, s: DeployStep['status']) => setDeploySteps(prev => prev.map((step, idx) => idx === i ? { ...step, status: s } : step))

  // ─── New conversation ─────────────────────────────────────────────────
  const createConversation = async (title?: string) => {
    const r = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const conv = await r.json()
    await fetchConversations()
    setActiveConvId(conv.id)
    setMessages([])
    return conv.id as string
  }

  // ─── Switch conversation ──────────────────────────────────────────────
  const switchConversation = (convId: string) => {
    if (sending) return
    setActiveConvId(convId)
    loadMessages(convId)
  }

  // ─── Delete conversation ──────────────────────────────────────────────
  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Supprimer cette conversation ?')) return
    await fetch('/api/conversations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: convId }),
    })
    if (activeConvId === convId) {
      setActiveConvId(null)
      setMessages([])
    }
    fetchConversations(searchQuery || undefined)
  }

  // ─── Search conversations ─────────────────────────────────────────────
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      fetchConversations(query || undefined)
    }, 300)
  }

  // ─── Provisioning ─────────────────────────────────────────────────────
  const handleProvision = async () => {
    setProvisioning(true); setDeployError(null)
    setDeploySteps([
      { label: 'Lancement du provisioning', status: 'active' },
      { label: 'Creation du workspace', status: 'pending' },
      { label: 'Demarrage du container Docker', status: 'pending' },
      { label: 'Initialisation OpenClaw', status: 'pending' },
      { label: 'Configuration du modele LLM', status: 'pending' },
      { label: 'Verification de sante', status: 'pending' },
    ])
    try {
      const res = await fetch('/api/openclaw/provision', { method: 'POST' })
      if (!res.ok) { const d = await res.json(); setDeployError(d.error); updateStep(0, 'error'); setProvisioning(false); return }
      updateStep(0, 'done'); updateStep(1, 'active')
      let attempts = 0
      const poll = async () => {
        attempts++; const st = await checkStatus(); setAgentStatus(st); await fetchLogs()
        if (st?.provisioned && st?.containerId) { updateStep(1, 'done'); updateStep(2, 'done')
          if (st.hasToken) { updateStep(3, 'done'); updateStep(4, 'done')
            if (st.healthy) { updateStep(5, 'done'); setProvisioning(false); return }
            updateStep(5, 'active')
          } else updateStep(3, 'active')
        } else if (st?.provisioned) updateStep(1, 'active')
        if (st?.status === 'error') { setDeployError(st.lastError || 'Erreur'); setDeploySteps(p => p.map(s => s.status === 'active' ? { ...s, status: 'error' } : s)); setProvisioning(false); return }
        if (attempts >= 60) { setDeployError('Timeout'); setDeploySteps(p => p.map(s => s.status === 'active' ? { ...s, status: 'error' } : s)); setProvisioning(false); return }
        setTimeout(poll, 3000)
      }
      setTimeout(poll, 3000)
    } catch (e) { setDeployError(e instanceof Error ? e.message : 'Erreur'); updateStep(0, 'error'); setProvisioning(false) }
  }

  // ─── Upload file ───────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await fetch('/api/chat/upload', { method: 'POST', body: formData })
        if (res.ok) {
          const data = await res.json()
          setAttachments(prev => [...prev, { path: data.path, name: data.name, type: data.type, dataUrl: data.dataUrl }])
        }
      } catch { /* ignore */ }
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // ─── Send message ─────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim()
    if (!text && attachments.length === 0) return
    if (sending) return

    // Auto-create conversation if none active
    let convId = activeConvId
    if (!convId) {
      convId = await createConversation()
    }

    // Build message: images as base64 data URLs, files as workspace paths
    let fullMessage = text
    const imageAttachments = attachments.filter(a => a.dataUrl)
    const fileAttachments = attachments.filter(a => !a.dataUrl)

    if (imageAttachments.length > 0) {
      const imageRefs = imageAttachments.map(a => `[Image jointe: ${a.name}]`).join('\n')
      fullMessage = `${text}\n\n${imageRefs}`
    }
    if (fileAttachments.length > 0) {
      const fileList = fileAttachments.map(a => `- ${a.name} (chemin: workspace/${a.path})`).join('\n')
      fullMessage = `${fullMessage}\n\n[Fichiers joints dans le workspace:]\n${fileList}`
    }

    // Pass image data URLs separately for multimodal
    const imageDataUrls = imageAttachments.map(a => a.dataUrl!).filter(Boolean)

    const displayContent = text + (attachments.length > 0
      ? '\n' + attachments.map(a => `📎 ${a.name}`).join('\n')
      : '')

    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: displayContent, createdAt: new Date().toISOString() }])
    setInput(''); setAttachments([]); setSending(true)

    const assistantId = `asst-${Date.now()}`
    currentAssistantId.current = assistantId

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fullMessage, conversationId: convId, images: imageDataUrls }),
      })

      if (!res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: `Erreur : ${data.error}`, createdAt: new Date().toISOString() }])
        return
      }

      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', createdAt: new Date().toISOString() }])

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue
          try {
            const ev = JSON.parse(raw)
            if (ev.type === 'delta' && ev.content) {
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + ev.content } : m))
            }
            if (ev.type === 'tool_use') {
              // Show tool usage as a subtle inline indicator
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + `\n\n> ⚙ *${ev.command}*\n\n` }
                  : m
              ))
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => {
        const ex = prev.find(m => m.id === assistantId)
        if (ex?.content) return prev
        return [...prev.filter(m => m.id !== assistantId), { id: assistantId, role: 'assistant' as const, content: 'Erreur de connexion.', createdAt: new Date().toISOString() }]
      })
    } finally {
      setSending(false); currentAssistantId.current = null; inputRef.current?.focus()
      fetchConversations() // Refresh titles
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
  const isReady = agentStatus?.provisioned && agentStatus?.status === 'running' && agentStatus?.healthy

  if (loading) return <div className="flex items-center justify-center h-full"><p className="text-sm text-ui-text-tertiary">Chargement...</p></div>

  // ─── Deploy screen ────────────────────────────────────────────────────
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-brand-violet flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">M</div>
            <h2 className="text-lg font-medium text-ui-text-primary mb-2">{provisioning ? 'Deploiement en cours...' : 'Deployer votre Agent MULTI'}</h2>
            <p className="text-sm text-ui-text-secondary">{provisioning ? 'Container Docker isole en creation.' : 'Votre agent sera deploye dans un environnement isole.'}</p>
          </div>
          {deploySteps.length > 0 && (<div className="mb-6 space-y-2">{deploySteps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                {step.status === 'done' && <span className="text-brand-green text-sm">✓</span>}
                {step.status === 'active' && <span className="w-3 h-3 rounded-full border-2 border-brand-violet border-t-transparent animate-spin" />}
                {step.status === 'pending' && <span className="w-2 h-2 rounded-full bg-ui-bg-tertiary" />}
                {step.status === 'error' && <span className="text-status-error text-sm">✗</span>}
              </div>
              <span className={`text-sm ${step.status === 'active' ? 'text-ui-text-primary font-medium' : step.status === 'done' ? 'text-brand-green' : step.status === 'error' ? 'text-status-error' : 'text-ui-text-tertiary'}`}>{step.label}</span>
            </div>))}</div>)}
          {deployLogs.length > 0 && (<div className="mb-6 rounded-lg bg-gray-900 p-3"><p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Container logs</p><div className="space-y-0.5 max-h-40 overflow-y-auto">{deployLogs.map((log, i) => <p key={i} className="text-[11px] font-mono text-gray-300 leading-tight truncate">{log}</p>)}</div></div>)}
          {deployError && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-xs text-status-error">{deployError}</p></div>}
          {!provisioning && <div className="text-center"><button onClick={handleProvision} className="px-6 py-2.5 rounded-lg bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet-dark transition-colors">{deploySteps.length > 0 ? 'Reessayer' : 'Deployer l\'agent'}</button></div>}
        </div>
      </div>
    )
  }

  // ─── Chat with conversation sidebar ───────────────────────────────────
  const hasContent = messages.find(m => m.id === currentAssistantId.current)?.content
  const showTyping = sending && !hasContent

  return (
    <div className="flex h-full">
      {/* Conversation sidebar */}
      <div className="w-56 shrink-0 border-r border-ui-border bg-ui-bg-secondary flex flex-col">
        <div className="p-3 border-b border-ui-border space-y-2">
          <button
            onClick={() => createConversation()}
            className="w-full px-3 py-2 rounded-lg bg-brand-violet text-white text-xs font-medium hover:bg-brand-violet-dark transition-colors"
          >
            + Nouvelle conversation
          </button>
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full px-3 py-1.5 rounded-lg border border-ui-border bg-ui-bg text-xs text-ui-text-primary placeholder:text-ui-text-tertiary focus:outline-none focus:border-brand-violet transition-colors"
          />
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => switchConversation(conv.id)}
              className={`group w-full text-left px-3 py-2.5 text-xs transition-colors cursor-pointer flex items-start justify-between gap-1 ${
                activeConvId === conv.id
                  ? 'bg-brand-violet-light text-brand-violet font-medium'
                  : 'text-ui-text-secondary hover:bg-ui-bg-tertiary'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate">{conv.title}</p>
                {conv.lastMessageAt && (
                  <p className="text-[10px] text-ui-text-tertiary mt-0.5">
                    {new Date(conv.lastMessageAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => deleteConversation(conv.id, e)}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-ui-text-tertiary hover:text-status-error transition-all p-0.5"
                title="Supprimer"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-[10px] text-ui-text-tertiary text-center py-4 px-3">
              {searchQuery ? 'Aucun resultat.' : 'Aucune conversation. Cliquez sur + pour commencer.'}
            </p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-ui-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-violet flex items-center justify-center text-white text-xs font-bold">M</div>
            <div>
              <p className="text-sm font-medium text-ui-text-primary">Agent MULTI</p>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${sending ? 'bg-yellow-500 animate-pulse' : 'bg-brand-green animate-pulse'}`} />
                <span className="text-[10px] text-ui-text-tertiary">{sending ? `Travaille... ${elapsedSeconds}s` : 'En ligne'}</span>
              </div>
            </div>
          </div>
          {sending && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-50 border border-yellow-200">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-xs text-yellow-800">Agent en cours... {elapsedSeconds}s</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeConvId && messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-ui-text-tertiary">Selectionnez une conversation ou creez-en une nouvelle.</p>
            </div>
          )}
          {activeConvId && messages.length === 0 && !sending && (
            <div className="text-center py-12">
              <p className="text-sm text-ui-text-tertiary">Posez une question ou demandez une tache a votre agent.</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user' ? 'bg-brand-violet text-white rounded-br-md' : 'bg-ui-bg-tertiary text-ui-text-primary rounded-bl-md'
              }`}>
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="text-sm leading-relaxed prose-chat">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}
                {msg.content && <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-ui-text-tertiary'}`}>{new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>}
              </div>
            </div>
          ))}

          {showTyping && (
            <div className="flex justify-start">
              <div className="bg-ui-bg-tertiary rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-ui-text-tertiary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-ui-text-tertiary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-ui-text-tertiary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] text-ui-text-tertiary ml-1">
                    {elapsedSeconds > 10 ? 'L\'agent execute des actions...' : elapsedSeconds > 3 ? 'Reflexion en cours...' : ''}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-ui-border shrink-0">
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-ui-bg-tertiary border border-ui-border text-xs">
                  <span>{att.type.startsWith('image/') ? '🖼' : '📎'}</span>
                  <span className="text-ui-text-primary truncate max-w-32">{att.name}</span>
                  <button onClick={() => removeAttachment(i)} className="text-ui-text-tertiary hover:text-status-error ml-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.md,.html,.css,.js,.json,.csv,.doc,.docx,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            {/* Attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploading}
              className="shrink-0 w-10 h-10 rounded-xl border border-ui-border text-ui-text-tertiary flex items-center justify-center hover:bg-ui-bg-tertiary hover:text-ui-text-primary transition-colors disabled:opacity-40"
              title="Joindre un fichier"
            >
              {uploading ? (
                <span className="w-4 h-4 rounded-full border-2 border-ui-text-tertiary border-t-transparent animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              )}
            </button>
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
            <button onClick={handleSend} disabled={(!input.trim() && attachments.length === 0) || sending} className="shrink-0 w-10 h-10 rounded-xl bg-brand-violet text-white flex items-center justify-center hover:bg-brand-violet-dark transition-colors disabled:opacity-40">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
