'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function SignUpPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName: firstName || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/chat')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription echouee')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ui-bg-secondary">
      <div className="w-full max-w-sm bg-ui-bg border border-ui-border rounded-lg p-6">
        <h1 className="text-xl font-medium text-ui-text-primary mb-1">Creer un compte</h1>
        <p className="text-sm text-ui-text-secondary mb-6">
          Commencez a construire votre machine a revenus
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-ui-text-primary mb-1">Prenom</label>
            <Input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Julien"
            />
          </div>
          <div>
            <label className="block text-sm text-ui-text-primary mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-ui-text-primary mb-1">Mot de passe</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6 caracteres minimum"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-sm text-status-error">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creation...' : 'Creer mon compte'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-ui-text-secondary">
          Deja un compte ?{' '}
          <Link href="/sign-in" className="text-brand-violet hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
