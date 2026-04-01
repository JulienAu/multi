'use client'

import { Header } from '@/components/Header'
import { Wizard } from '@/components/wizard/Wizard'

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-ui-bg">
        <Wizard />
      </main>
    </>
  )
}
