'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export function Header() {
  const [user, setUser] = useState<{ email: string; firstName: string | null } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => { if (data.user) setUser(data.user) })
      .catch(() => {})
  }, [])

  return (
    <header className="border-b border-ui-border bg-ui-bg">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-medium text-brand-violet tracking-tight">
          MULTI
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/chat" className="text-sm text-brand-violet hover:underline">
              Mon Agent
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm text-ui-text-secondary hover:text-ui-text-primary">
                Connexion
              </Link>
              <Link
                href="/sign-up"
                className="text-sm px-3 py-1.5 rounded-lg bg-brand-violet text-white hover:bg-brand-violet-dark transition-colors"
              >
                Creer un compte
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
