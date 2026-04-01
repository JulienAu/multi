import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { PostHogProvider } from '@/components/providers/PostHogProvider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MULTI - Construisez votre machine a revenus',
  description: 'Repondez a 12 questions. MULTI deploie votre equipe d\'agents IA.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-ui-bg text-ui-text-primary antialiased">
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  )
}
