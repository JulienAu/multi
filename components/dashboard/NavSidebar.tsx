'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/chat', label: 'Chat Agent', icon: '●' },
  { href: '/files', label: 'Fichiers', icon: '◆' },
  { href: '/preview', label: 'Preview', icon: '▶' },
  { href: '/business-md', label: 'BUSINESS.md', icon: '☰' },
  { href: '/agents', label: 'Agents', icon: '⚡' },
]

interface UserInfo {
  email: string
  firstName: string | null
  stripeCustomerId: string | null
}

interface BusinessInfo {
  id: string
  name: string
  plan: string | null
  subscriptionStatus: string | null
}

export function NavSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [business, setBusiness] = useState<BusinessInfo | null>(null)
  const [businesses, setBusinesses] = useState<BusinessInfo[]>([])
  const [switcherOpen, setSwitcherOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) setUser(data.user)
        if (data.business) setBusiness(data.business)
      })
      .catch(() => {})
    fetch('/api/business')
      .then(r => r.json())
      .then(data => { if (data.businesses) setBusinesses(data.businesses) })
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

  const handleSwitchBusiness = async (businessId: string) => {
    const res = await fetch('/api/business/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId }),
    })
    if (res.ok) window.location.reload()
  }

  return (
    <aside className="w-56 shrink-0 border-r border-ui-border bg-ui-bg-secondary h-screen sticky top-0 flex flex-col">
      <div className="px-4 py-4 border-b border-ui-border">
        <Link href="/chat" className="text-lg font-medium text-brand-violet tracking-tight">
          MULTI
        </Link>
      </div>

      {business && (
        <div className="px-3 py-2 border-b border-ui-border relative">
          <button
            onClick={() => setSwitcherOpen(o => !o)}
            className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-ui-bg-tertiary transition-colors text-left"
          >
            <div className="min-w-0">
              <p className="text-xs text-ui-text-tertiary">Business</p>
              <p className="text-sm text-ui-text-primary truncate">{business.name}</p>
            </div>
            <span className="text-xs text-ui-text-tertiary">▾</span>
          </button>
          {switcherOpen && (
            <div className="absolute left-2 right-2 mt-1 bg-ui-bg-secondary border border-ui-border rounded-lg shadow-lg z-10">
              {businesses.map(b => (
                <button
                  key={b.id}
                  onClick={() => handleSwitchBusiness(b.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-ui-bg-tertiary ${
                    b.id === business.id ? 'text-brand-violet font-medium' : 'text-ui-text-primary'
                  }`}
                >
                  {b.name}
                </button>
              ))}
              <Link
                href="/"
                className="block px-3 py-2 text-sm text-ui-text-tertiary hover:bg-ui-bg-tertiary border-t border-ui-border"
              >
                + Nouveau business
              </Link>
            </div>
          )}
        </div>
      )}

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
            {business?.plan && (
              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium uppercase rounded-full bg-brand-violet-light text-brand-violet">
                {business.plan}
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
