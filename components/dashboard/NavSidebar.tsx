'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '\u25A0' },
  { href: '/business-md', label: 'BUSINESS.md', icon: '\u2630' },
  { href: '/scorecard', label: 'Scorecard', icon: '\u2605' },
  { href: '/agents', label: 'Agents', icon: '\u26A1' },
]

interface UserInfo {
  email: string
  firstName: string | null
  plan: string | null
  stripeCustomerId: string | null
}

export function NavSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => { if (data.user) setUser(data.user) })
      .catch(() => {})
  }, [])

  const handleSignOut = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    router.push('/')
  }

  const handleManageSubscription = async () => {
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  return (
    <aside className="w-56 shrink-0 border-r border-ui-border bg-ui-bg-secondary h-screen sticky top-0 flex flex-col">
      <div className="px-4 py-4 border-b border-ui-border">
        <Link href="/dashboard" className="text-lg font-medium text-brand-violet tracking-tight">
          MULTI
        </Link>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-brand-violet-light text-brand-violet font-medium'
                  : 'text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-tertiary'
              }`}
            >
              <span className="text-xs">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-ui-border">
        {user && (
          <div className="mb-2">
            <p className="text-sm text-ui-text-primary truncate">
              {user.firstName || user.email}
            </p>
            <p className="text-xs text-ui-text-tertiary truncate">{user.email}</p>
            {user.plan && (
              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium uppercase rounded-full bg-brand-violet-light text-brand-violet">
                {user.plan}
              </span>
            )}
          </div>
        )}
        {user?.stripeCustomerId && (
          <button
            onClick={handleManageSubscription}
            className="block text-xs text-ui-text-tertiary hover:text-ui-text-primary transition-colors mb-1"
          >
            Gerer mon abonnement
          </button>
        )}
        <button
          onClick={handleSignOut}
          className="text-xs text-ui-text-tertiary hover:text-status-error transition-colors"
        >
          Deconnexion
        </button>
      </div>
    </aside>
  )
}
