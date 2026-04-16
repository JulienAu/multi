'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface EmailCaptureProps {
  sessionId: string | null
}

export function EmailCapture({ sessionId }: EmailCaptureProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !sessionId) return

    setStatus('loading')
    try {
      const res = await fetch('/api/wizard/save-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, email }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-brand-green bg-brand-green-light p-4 text-center">
          <p className="text-sm text-brand-green-dark font-medium">
            Votre BUSINESS.md a ete envoye a {email}
          </p>
        </div>

        <div className="rounded-lg border border-brand-violet bg-brand-violet-light p-6 text-center">
          <h3 className="text-md font-medium text-brand-violet mb-2">
            Retrouvez votre BUSINESS.md a tout moment
          </h3>
          <p className="text-sm text-ui-text-secondary mb-4">
            Creez un compte pour acceder a votre dashboard, modifier votre document et activer vos agents IA.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet-dark transition-colors"
          >
            Creer mon compte gratuit
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-ui-border bg-ui-bg-secondary p-6">
      <h3 className="text-md font-medium text-ui-text-primary mb-1">
        Recevez votre BUSINESS.md par email
      </h3>
      <p className="text-sm text-ui-text-secondary mb-4">
        Gardez une copie. Pas de spam, promis.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="votre@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Envoi...' : 'Envoyer'}
        </Button>
      </form>

      {status === 'error' && (
        <p className="mt-2 text-xs text-status-error">Erreur. Réessayez.</p>
      )}
    </div>
  )
}
