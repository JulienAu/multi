'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useRef, Suspense } from 'react'

function PreviewContent() {
  const searchParams = useSearchParams()
  const initialPath = searchParams.get('path') ?? ''
  const [urlInput, setUrlInput] = useState(initialPath)
  const [currentPath, setCurrentPath] = useState(initialPath)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const previewUrl = currentPath
    ? `/api/openclaw/preview/${currentPath}`
    : null

  const handleNavigate = (e?: React.FormEvent) => {
    e?.preventDefault()
    setCurrentPath(urlInput)
  }

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-ui-border bg-ui-bg-secondary flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setCurrentPath(''); setUrlInput('') }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ui-text-tertiary hover:bg-ui-bg-tertiary transition-colors"
            title="Accueil"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </button>
          <button
            onClick={handleRefresh}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ui-text-tertiary hover:bg-ui-bg-tertiary transition-colors"
            title="Rafraichir"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
          </button>
        </div>

        <form onSubmit={handleNavigate} className="flex-1 flex gap-2">
          <div className="flex-1 flex items-center rounded-lg border border-ui-border bg-ui-bg overflow-hidden">
            <span className="px-3 text-xs text-ui-text-tertiary shrink-0">workspace/</span>
            <input
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="premium_sushi_site/index.html"
              className="flex-1 py-1.5 pr-3 text-xs text-ui-text-primary bg-transparent focus:outline-none placeholder:text-ui-text-tertiary"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-brand-violet text-white text-xs font-medium hover:bg-brand-violet-dark transition-colors"
          >
            Ouvrir
          </button>
        </form>

        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ui-text-tertiary hover:bg-ui-bg-tertiary transition-colors"
            title="Ouvrir dans un nouvel onglet"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
          </a>
        )}
      </div>

      {/* Preview area */}
      {previewUrl ? (
        <iframe
          ref={iframeRef}
          src={previewUrl}
          className="flex-1 w-full bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-ui-bg">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-ui-bg-tertiary flex items-center justify-center text-3xl mx-auto mb-4">🌐</div>
            <h2 className="text-lg font-medium text-ui-text-primary mb-2">Preview</h2>
            <p className="text-sm text-ui-text-secondary mb-4">
              Entrez le chemin d&apos;un fichier HTML dans la barre d&apos;adresse, ou cliquez sur &quot;Voir le site&quot; depuis la page Fichiers.
            </p>
            <p className="text-xs text-ui-text-tertiary">
              Exemple : premium_sushi_site/public/index.html
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><p className="text-sm text-ui-text-tertiary">Chargement...</p></div>}>
      <PreviewContent />
    </Suspense>
  )
}
