'use client'

import { useEffect, useState } from 'react'
import { BusinessMdEditor } from '@/components/dashboard/BusinessMdEditor'
import Link from 'next/link'

interface DocData {
  id: string
  content: string
  version: number
  lineCount: number | null
  sectionCount: number | null
  sector: string | null
  businessName: string | null
  regenerating: boolean
  createdAt: string
}

export default function BusinessMdPage() {
  const [doc, setDoc] = useState<DocData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/business-md')
      .then(r => r.json())
      .then(data => {
        if (data.id) setDoc(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-medium text-ui-text-primary mb-0.5">BUSINESS.md</h1>
          <p className="text-sm text-ui-text-secondary">
            {doc ? `${doc.businessName ?? 'Votre business'} — v${doc.version} — ${doc.lineCount ?? '?'} lignes, ${doc.sectionCount ?? '?'} sections` : 'Votre document strategique'}
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-ui-text-tertiary">Chargement...</p>
      )}

      {!loading && doc && (
        <BusinessMdEditor
          docId={doc.id}
          initialContent={doc.content}
          initialVersion={doc.version}
          initialRegenerating={doc.regenerating}
        />
      )}

      {!loading && !doc && (
        <div className="rounded-lg border border-ui-border bg-ui-bg-secondary p-6 text-center">
          <p className="text-sm text-ui-text-secondary mb-4">
            Aucun BUSINESS.md genere. Completez le wizard pour en creer un.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-brand-violet text-white text-sm font-medium hover:bg-brand-violet-dark transition-colors"
          >
            Lancer le wizard
          </Link>
        </div>
      )}
    </div>
  )
}
