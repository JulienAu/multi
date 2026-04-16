'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: `Bienvenue ! Je suis le **Coach ARS**, ton compagnon pour le livre *Agentic Revenue Systems*.

Je suis entraîné sur l&apos;intégralité du livre et je suis là pour t&apos;aider à :
- **Comprendre** les concepts clés (Capital Agentique, méthode VALUE, Canvas ARS...)
- **Identifier** ton profil et ton positionnement dans la Matrice
- **Construire** ton premier ARS pas à pas

Par où veux-tu commencer ?`,
}

const SUGGESTIONS = [
  'C&apos;est quoi un ARS ?',
  'Quel est mon profil ?',
  'Explique la méthode VALUE',
]

export function ArsCoachChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messageCount, setMessageCount] = useState(0)
  const [activated, setActivated] = useState(false)
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [showEmailBlock, setShowEmailBlock] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSubmitting, setEmailSubmitting] = useState(false)
  const [emailError, setEmailError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(scrollToBottom, [messages])

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  // Init session + load history
  useEffect(() => {
    async function init() {
      const stored = localStorage.getItem('ars_coach_session')

      if (stored) {
        try {
          const data = JSON.parse(stored)
          setSessionId(data.sessionId)

          const res = await fetch(`/api/ars-coach/chat?sessionId=${data.sessionId}`)
          if (res.ok) {
            const { messages: history, session } = await res.json()
            setMessageCount(session.messageCount)
            setActivated(session.activated)
            persistSession({ messageCount: session.messageCount, activated: session.activated })

            if (!session.activated && session.messageCount >= 3) {
              setShowEmailPrompt(true)
            }

            if (history.length > 0) {
              setMessages([WELCOME_MESSAGE, ...history])
            }
          }
        } catch { /* ignore */ }
      } else {
        try {
          const res = await fetch('/api/ars-coach/session', { method: 'POST' })
          const data = await res.json()
          setSessionId(data.sessionId)
          localStorage.setItem('ars_coach_session', JSON.stringify({
            sessionId: data.sessionId, messageCount: 0, activated: false,
          }))
        } catch (e) { console.error(e) }
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persistSession = useCallback((updates: Record<string, unknown>) => {
    const stored = localStorage.getItem('ars_coach_session')
    const current = stored ? JSON.parse(stored) : {}
    const updated = { ...current, ...updates }
    localStorage.setItem('ars_coach_session', JSON.stringify(updated))
  }, [])

  const handleActivate = async () => {
    if (!email.trim() || !sessionId) return
    setEmailSubmitting(true)
    setEmailError('')
    try {
      const res = await fetch('/api/ars-coach/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, email: email.trim() }),
      })
      if (!res.ok) { setEmailError('Erreur. Verifie ton email.'); return }
      setActivated(true)
      setShowEmailPrompt(false)
      setShowEmailBlock(false)
      persistSession({ activated: true, email: email.trim() })
    } catch {
      setEmailError('Erreur de connexion.')
    } finally {
      setEmailSubmitting(false)
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending || !sessionId) return

    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text.trim() }])
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setSending(true)

    const newCount = messageCount + 1
    setMessageCount(newCount)
    persistSession({ messageCount: newCount })

    if (!activated && newCount === 3) {
      setShowEmailPrompt(true)
    }

    const assistantId = `asst-${Date.now()}`
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/ars-coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), sessionId }),
      })

      if (res.status === 429) {
        setShowEmailBlock(true)
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Tu as atteint la limite de messages gratuits. Entre ton email ci-dessous pour continuer.' }
            : m
        ))
        setSending(false)
        return
      }

      if (!res.ok) {
        const data = await res.json()
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: `Erreur : ${data.error}` } : m
        ))
        setSending(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')
      const decoder = new TextDecoder()
      let buffer = ''
      let content = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const ev = JSON.parse(line.slice(6).trim())
            if (ev.type === 'delta' && ev.content) {
              content += ev.content
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content } : m
              ))
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === assistantId && !m.content
          ? { ...m, content: 'Erreur de connexion. Reessaie.' }
          : m
      ))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleSend = () => sendMessage(input)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const hasStarted = messages.length > 1
  const isStreaming = sending && messages.some(m => m.id.startsWith('asst-') && m.content)
  const isWaiting = sending && !isStreaming

  return (
    <div className="flex flex-col h-dvh bg-ui-bg">
      {/* Header */}
      <header className="px-4 py-3 border-b border-ui-border shrink-0 bg-ui-bg/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-brand-violet flex items-center justify-center text-white text-xs font-bold tracking-tight">
              ARS
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand-green border-2 border-ui-bg" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-ui-text-primary">ARS Coach</h1>
            <p className="text-[11px] text-ui-text-tertiary truncate">
              {sending ? 'Reflexion en cours...' : 'Compagnon du livre Agentic Revenue Systems'}
            </p>
          </div>
          {!activated && messageCount > 0 && (
            <div className="text-[10px] text-ui-text-tertiary bg-ui-bg-tertiary px-2 py-1 rounded-full shrink-0">
              {messageCount}/10
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-up`}>
              {/* Avatar */}
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-brand-violet/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-violet">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-brand-violet text-white rounded-br-sm'
                  : 'bg-ui-bg-secondary border border-ui-border rounded-bl-sm'
              }`}>
                {msg.role === 'user' ? (
                  <p className="text-[14px] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="text-[14px] leading-relaxed prose-chat">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isWaiting && (
            <div className="flex gap-3 animate-fade-up">
              <div className="w-7 h-7 rounded-lg bg-brand-violet/10 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-violet">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="bg-ui-bg-secondary border border-ui-border rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-violet/40 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-violet/40 animate-pulse" style={{ animationDelay: '300ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-violet/40 animate-pulse" style={{ animationDelay: '600ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Suggestions (only before first message) */}
          {!hasStarted && (
            <div className="flex flex-wrap gap-2 pt-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s.replace(/&apos;/g, "'"))}
                  className="px-3.5 py-2 rounded-xl border border-ui-border text-[13px] text-ui-text-secondary hover:border-brand-violet hover:text-brand-violet hover:bg-brand-violet-light transition-all duration-200 cursor-pointer"
                >
                  {s.replace(/&apos;/g, "'")}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Email prompt (soft) */}
      {showEmailPrompt && !activated && !showEmailBlock && (
        <div className="border-t border-ui-border bg-brand-violet-light/50 animate-fade-up">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-violet shrink-0">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
            <p className="text-xs text-ui-text-secondary flex-1">Sauvegarde ton parcours</p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="w-44 px-3 py-1.5 rounded-lg border border-ui-border bg-ui-bg text-xs focus:outline-none focus:ring-2 focus:ring-brand-violet/30 focus:border-brand-violet transition-all"
              onKeyDown={e => e.key === 'Enter' && handleActivate()}
            />
            <button
              onClick={handleActivate}
              disabled={emailSubmitting}
              className="px-3 py-1.5 rounded-lg bg-brand-violet text-white text-xs font-medium hover:bg-brand-violet-dark transition-colors disabled:opacity-50 cursor-pointer"
            >
              {emailSubmitting ? '...' : 'OK'}
            </button>
            <button
              onClick={() => setShowEmailPrompt(false)}
              className="p-1.5 text-ui-text-tertiary hover:text-ui-text-secondary cursor-pointer"
              aria-label="Fermer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          {emailError && <p className="text-[10px] text-status-error text-center pb-2">{emailError}</p>}
        </div>
      )}

      {/* Email block (hard) */}
      {showEmailBlock && !activated && (
        <div className="border-t border-brand-violet/20 bg-brand-violet-light animate-fade-up">
          <div className="max-w-2xl mx-auto px-4 py-4 text-center">
            <p className="text-sm font-medium text-ui-text-primary mb-1">
              Entre ton email pour continuer
            </p>
            <p className="text-xs text-ui-text-secondary mb-3">
              10 messages gratuits utilises. Debloque l&apos;acces complet.
            </p>
            <div className="flex gap-2 max-w-sm mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ton@email.com"
                className="flex-1 px-3 py-2.5 rounded-xl border border-ui-border bg-ui-bg text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/30 focus:border-brand-violet transition-all"
                onKeyDown={e => e.key === 'Enter' && handleActivate()}
                autoFocus
              />
              <button
                onClick={handleActivate}
                disabled={emailSubmitting}
                className="px-5 py-2.5 rounded-xl bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet-dark transition-colors disabled:opacity-50 cursor-pointer"
              >
                {emailSubmitting ? '...' : 'Continuer'}
              </button>
            </div>
            {emailError && <p className="text-xs text-status-error mt-2">{emailError}</p>}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-ui-border bg-ui-bg shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Pose ta question sur le livre..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-ui-border bg-ui-bg-secondary px-4 py-2.5 text-[14px] text-ui-text-primary placeholder:text-ui-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-violet/30 focus:border-brand-violet focus:bg-ui-bg transition-all"
              style={{ maxHeight: '120px' }}
              disabled={sending || (showEmailBlock && !activated)}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || (showEmailBlock && !activated)}
              className="shrink-0 w-11 h-11 rounded-xl bg-brand-violet text-white flex items-center justify-center hover:bg-brand-violet-dark active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100 cursor-pointer"
              aria-label="Envoyer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
