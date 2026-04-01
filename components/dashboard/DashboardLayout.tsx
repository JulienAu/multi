'use client'

import { NavSidebar } from './NavSidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <NavSidebar />
      <main className="flex-1 bg-ui-bg">
        {children}
      </main>
    </div>
  )
}
