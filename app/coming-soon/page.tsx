'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ComingSoonPage() {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'subscribed' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim() || status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/coming-soon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: value.trim() }),
      })
      const data = await res.json()

      if (data.access) {
        // Early access granted — redirect to home
        router.push('/')
        return
      }

      if (data.subscribed) {
        setStatus('subscribed')
        return
      }

      setErrorMsg(data.error || 'Une erreur est survenue.')
      setStatus('error')
    } catch {
      setErrorMsg('Erreur de connexion.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-dvh bg-ui-bg flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-brand-violet flex items-center justify-center text-white text-2xl font-bold mx-auto mb-8">
          M
        </div>

        <h1 className="text-3xl font-semibold text-ui-text-primary mb-3 tracking-tight">
          MULTI arrive bientot.
        </h1>

        <p className="text-md text-ui-text-secondary mb-8 leading-relaxed">
          La plateforme qui deploie votre equipe d&apos;agents IA.
          <br />
          Laissez votre email pour etre prevenu au lancement.
        </p>

        {status === 'subscribed' ? (
          <div className="animate-fade-up rounded-xl bg-brand-green-light border border-brand-green/20 p-4">
            <p className="text-sm font-medium text-brand-green-dark">
              C&apos;est note ! On vous previent des que MULTI est disponible.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="votre@email.com"
              className="flex-1 px-4 py-3 rounded-xl border border-ui-border bg-ui-bg text-sm text-ui-text-primary placeholder:text-ui-text-tertiary focus:outline-none focus:border-brand-violet transition-colors"
              autoFocus
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              disabled={!value.trim() || status === 'loading'}
              className="px-5 py-3 rounded-xl bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet-dark transition-colors disabled:opacity-40"
            >
              {status === 'loading' ? '...' : 'Me prevenir'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="text-xs text-status-error mt-2">{errorMsg}</p>
        )}

        {/* Link to ARS Coach */}
        <div className="mt-12 pt-8 border-t border-ui-border">
          <p className="text-xs text-ui-text-tertiary mb-2">
            Vous avez lu le livre ARS ?
          </p>
          <a
            href="/ars-coach"
            className="text-sm text-brand-violet hover:underline"
          >
            Acceder au Coach ARS
          </a>
        </div>
      </div>
    </div>
  )
}
