'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/chat')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion echouee')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ui-bg-secondary">
      <div className="w-full max-w-sm bg-ui-bg border border-ui-border rounded-lg p-6">
        <h1 className="text-xl font-medium text-ui-text-primary mb-1">Connexion</h1>
        <p className="text-sm text-ui-text-secondary mb-6">
          Accedez a votre dashboard MULTI
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="••••••"
              required
            />
          </div>

          {error && <p className="text-sm text-status-error">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-ui-text-secondary">
          Pas encore de compte ?{' '}
          <Link href="/sign-up" className="text-brand-violet hover:underline">
            Creer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
