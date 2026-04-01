'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'

interface VersionInfo {
  id: string
  version: number
  lineCount: number | null
  createdAt: string
}

interface BusinessMdEditorProps {
  docId: string
  initialContent: string
  initialVersion: number
  initialRegenerating?: boolean
}

export function BusinessMdEditor({ docId, initialContent, initialVersion, initialRegenerating }: BusinessMdEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [mode, setMode] = useState<'preview' | 'edit'>('preview')
  const [version, setVersion] = useState(initialVersion)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [showVersions, setShowVersions] = useState(false)
  const [regenerating, setRegenerating] = useState(initialRegenerating ?? false)
  const [copied, setCopied] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef(initialContent)
  const versionRef = useRef(initialVersion)

  // Polling pendant la régénération
  const pollForCompletion = useCallback(() => {
    if (pollRef.current) clearTimeout(pollRef.current)

    const poll = async () => {
      try {
        const res = await fetch('/api/business-md')
        if (!res.ok) return
        const data = await res.json()
        if (!data.id) return

        if (!data.regenerating) {
          // Régénération terminée
          if (data.version > versionRef.current) {
            setContent(data.content)
            setVersion(data.version)
            versionRef.current = data.version
            lastSavedRef.current = data.content
            setSaveStatus('saved')
          }
          setRegenerating(false)
          return
        }
      } catch { /* ignore */ }
      // Continuer à poll toutes les 3 secondes
      pollRef.current = setTimeout(poll, 3000)
    }

    pollRef.current = setTimeout(poll, 3000)
  }, [])

  // Démarrer le polling si on arrive sur la page pendant une regen en cours
  useEffect(() => {
    if (initialRegenerating) pollForCompletion()
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [initialRegenerating, pollForCompletion])

  // Sauvegarde automatique avec debounce 2s
  const save = useCallback(async (text: string) => {
    if (text === lastSavedRef.current) return
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/business-md/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      if (res.ok) {
        const data = await res.json()
        setVersion(data.version)
        versionRef.current = data.version
        lastSavedRef.current = text
        setSaveStatus('saved')
      }
    } catch {
      setSaveStatus('unsaved')
    }
  }, [docId])

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setSaveStatus('unsaved')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(newContent), 2000)
  }

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const fetchVersions = async () => {
    const res = await fetch(`/api/business-md/${docId}`)
    if (res.ok) {
      const data = await res.json()
      setVersions(data.versions ?? [])
    }
    setShowVersions(v => !v)
  }

  const handleRegenerate = async () => {
    if (!confirm('Regenerer le BUSINESS.md ? La version actuelle sera sauvegardee.')) return
    setRegenerating(true)
    try {
      const res = await fetch('/api/business-md/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId }),
      })
      if (res.ok) {
        // Lancer le polling pour récupérer le résultat
        pollForCompletion()
      } else {
        const data = await res.json()
        if (res.status === 409) {
          // Déjà en cours, lancer le polling
          pollForCompletion()
        } else {
          alert(data.error || 'Erreur de regeneration')
          setRegenerating(false)
        }
      }
    } catch (e) {
      console.error(e)
      setRegenerating(false)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'BUSINESS.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveStatusLabel = saveStatus === 'saving' ? 'Sauvegarde...' : saveStatus === 'saved' ? 'Sauvegarde' : 'Non sauvegarde'
  const saveStatusColor = saveStatus === 'saving' ? 'text-yellow-600' : saveStatus === 'saved' ? 'text-brand-green' : 'text-status-error'

  return (
    <div className="border border-ui-border rounded-lg overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 180px)' }}>
      {/* Toolbar */}
      <div className="px-4 py-2 bg-ui-bg-tertiary border-b border-ui-border flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-ui-text-primary">BUSINESS.md</span>
          <span className="text-[10px] text-ui-text-tertiary">v{version}</span>
          {regenerating ? (
            <span className="text-[10px] text-yellow-600 animate-pulse">Regeneration en cours...</span>
          ) : (
            <span className={`text-[10px] ${saveStatusColor}`}>{saveStatusLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-ui-border overflow-hidden">
            <button
              onClick={() => {
                if (mode === 'edit' && saveStatus === 'unsaved') save(content)
                setMode('preview')
              }}
              className={`px-2.5 py-1 text-xs ${mode === 'preview' ? 'bg-brand-violet text-white' : 'bg-ui-bg text-ui-text-secondary hover:bg-ui-bg-tertiary'}`}
            >
              Lecture
            </button>
            <button
              onClick={() => setMode('edit')}
              disabled={regenerating}
              className={`px-2.5 py-1 text-xs ${mode === 'edit' ? 'bg-brand-violet text-white' : 'bg-ui-bg text-ui-text-secondary hover:bg-ui-bg-tertiary'} disabled:opacity-50`}
            >
              Edition
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? 'Copie !' : 'Copier'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            Telecharger
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchVersions}>
            Versions
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating ? 'Regeneration...' : 'Regenerer'}
          </Button>
        </div>
      </div>

      {/* Banner régénération */}
      {regenerating && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-xs text-yellow-800">
            Regeneration en cours... Vous pouvez quitter cette page, le document sera mis a jour automatiquement.
          </span>
        </div>
      )}

      {/* Versions panel */}
      {showVersions && versions.length > 0 && (
        <div className="px-4 py-2 bg-ui-bg-secondary border-b border-ui-border">
          <p className="text-xs font-medium text-ui-text-primary mb-1.5">Historique des versions</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {versions.map(v => (
              <div key={v.id} className="flex items-center justify-between text-xs text-ui-text-secondary">
                <span>v{v.version} — {v.lineCount} lignes</span>
                <span>{new Date(v.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-ui-bg-secondary">
        {mode === 'edit' ? (
          <textarea
            value={content}
            onChange={e => handleContentChange(e.target.value)}
            className="w-full h-full min-h-[500px] p-6 font-mono text-xs text-ui-text-primary leading-relaxed bg-transparent resize-none focus:outline-none"
            spellCheck={false}
          />
        ) : (
          <pre className="p-6 whitespace-pre-wrap font-mono text-xs text-ui-text-primary leading-relaxed">
            {content}
          </pre>
        )}
      </div>
    </div>
  )
}
