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

Je suis entraîné sur l'intégralité du livre et je suis là pour t'aider à :
- **Comprendre** les concepts clés (Capital Agentique, méthode VALUE, Canvas ARS...)
- **Identifier** ton profil et ton positionnement dans la Matrice
- **Construire** ton premier ARS pas à pas

Par où veux-tu commencer ? Tu peux me poser une question sur un chapitre, ou on peut démarrer par ton **diagnostic** : quel est ton profil aujourd'hui ?`,
}

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

  // Init session + load history
  useEffect(() => {
    async function init() {
      const stored = localStorage.getItem('ars_coach_session')

      if (stored) {
        try {
          const data = JSON.parse(stored)
          setSessionId(data.sessionId)

          // Load history and session state from server
          const res = await fetch(`/api/ars-coach/chat?sessionId=${data.sessionId}`)
          if (res.ok) {
            const { messages: history, session } = await res.json()
            setMessageCount(session.messageCount)
            setActivated(session.activated)
            persistSession({ messageCount: session.messageCount, activated: session.activated })

            if (history.length > 0) {
              setMessages([WELCOME_MESSAGE, ...history])
            }
          }
        } catch { /* ignore, keep welcome message */ }
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

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending || !sessionId) return

    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text }])
    setInput('')
    setSending(true)

    const newCount = messageCount + 1
    setMessageCount(newCount)
    persistSession({ messageCount: newCount })

    // Show email prompt after 3 messages (soft ask)
    if (!activated && newCount === 3) {
      setShowEmailPrompt(true)
    }

    const assistantId = `asst-${Date.now()}`
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/ars-coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId }),
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex flex-col h-dvh bg-ui-bg">
      {/* Header */}
      <header className="px-4 py-3 border-b border-ui-border flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-brand-violet flex items-center justify-center text-white text-sm font-bold">
          ARS
        </div>
        <div>
          <h1 className="text-sm font-medium text-ui-text-primary">ARS Coach</h1>
          <p className="text-[10px] text-ui-text-tertiary">Compagnon du livre Agentic Revenue Systems</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}>
            <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 ${
              msg.role === 'user'
                ? 'bg-brand-violet text-white rounded-br-md'
                : 'bg-ui-bg-tertiary text-ui-text-primary rounded-bl-md'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              ) : (
                <div className="text-sm leading-relaxed prose-chat">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {sending && !messages.find(m => m.id.startsWith('asst-') && m.content) && (
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

      {/* Email prompt (soft — after 3 messages) */}
      {showEmailPrompt && !activated && !showEmailBlock && (
        <div className="mx-4 mb-2 p-3 rounded-xl bg-brand-violet-light border border-brand-violet/20 animate-fade-up">
          <p className="text-xs text-ui-text-primary mb-2">
            Sauvegarde ton parcours pour ne pas perdre ta progression.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="flex-1 px-3 py-1.5 rounded-lg border border-ui-border bg-ui-bg text-xs focus:outline-none focus:border-brand-violet"
              onKeyDown={e => e.key === 'Enter' && handleActivate()}
            />
            <button
              onClick={handleActivate}
              disabled={emailSubmitting}
              className="px-3 py-1.5 rounded-lg bg-brand-violet text-white text-xs font-medium hover:bg-brand-violet-dark transition-colors disabled:opacity-50"
            >
              {emailSubmitting ? '...' : 'Sauvegarder'}
            </button>
            <button
              onClick={() => setShowEmailPrompt(false)}
              className="px-2 py-1.5 text-xs text-ui-text-tertiary hover:text-ui-text-secondary"
            >
              Plus tard
            </button>
          </div>
          {emailError && <p className="text-[10px] text-status-error mt-1">{emailError}</p>}
        </div>
      )}

      {/* Email block (hard — at 10 messages) */}
      {showEmailBlock && !activated && (
        <div className="mx-4 mb-2 p-4 rounded-xl bg-brand-violet-light border border-brand-violet/20 animate-fade-up">
          <p className="text-sm font-medium text-ui-text-primary mb-1">
            Entre ton email pour continuer
          </p>
          <p className="text-xs text-ui-text-secondary mb-3">
            Tu as utilise tes 10 messages gratuits. Entre ton email pour debloquer l'acces complet.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="flex-1 px-3 py-2 rounded-lg border border-ui-border bg-ui-bg text-sm focus:outline-none focus:border-brand-violet"
              onKeyDown={e => e.key === 'Enter' && handleActivate()}
            />
            <button
              onClick={handleActivate}
              disabled={emailSubmitting}
              className="px-4 py-2 rounded-lg bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet-dark transition-colors disabled:opacity-50"
            >
              {emailSubmitting ? '...' : 'Continuer'}
            </button>
          </div>
          {emailError && <p className="text-xs text-status-error mt-1">{emailError}</p>}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-ui-border shrink-0">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pose ta question sur le livre..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-ui-border bg-ui-bg px-4 py-2.5 text-sm text-ui-text-primary placeholder:text-ui-text-tertiary focus:outline-none focus:border-brand-violet transition-colors"
            style={{ maxHeight: '120px' }}
            disabled={sending || (showEmailBlock && !activated)}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || (showEmailBlock && !activated)}
            className="shrink-0 w-10 h-10 rounded-xl bg-brand-violet text-white flex items-center justify-center hover:bg-brand-violet-dark transition-colors disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        {!activated && (
          <p className="text-[10px] text-ui-text-tertiary text-center mt-1.5">
            {messageCount}/10 messages gratuits
          </p>
        )}
      </div>
    </div>
  )
}
