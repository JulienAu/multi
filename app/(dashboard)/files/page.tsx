'use client'

import { useEffect, useState } from 'react'

interface FileEntry {
  name: string
  path: string
  size: number
  isDir: boolean
}

const PREVIEWABLE = ['.html', '.htm', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.txt', '.md', '.css', '.js', '.json']

export default function FilesPage() {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [previewPath, setPreviewPath] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/openclaw/files')
      .then(r => r.json())
      .then(d => { setFiles(d.files ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const getFileUrl = (path: string) => `/api/openclaw/files?path=${encodeURIComponent(path)}`
  const ext = (name: string) => '.' + name.split('.').pop()?.toLowerCase()
  const isPreviewable = (name: string) => PREVIEWABLE.includes(ext(name))
  const isHtml = (name: string) => ['.html', '.htm'].includes(ext(name))
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '--'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const userFiles = files.filter(f => !f.isDir && !f.name.endsWith('.md') && f.name !== 'update-check.json')
  const systemFiles = files.filter(f => !f.isDir && f.name.endsWith('.md'))

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-medium text-ui-text-primary mb-1">Fichiers de l'agent</h1>
      <p className="text-sm text-ui-text-secondary mb-6">
        Fichiers crees par votre agent OpenClaw dans son workspace.
      </p>

      {loading && <p className="text-sm text-ui-text-tertiary">Chargement...</p>}

      {!loading && userFiles.length === 0 && (
        <div className="rounded-lg border border-ui-border bg-ui-bg-secondary p-6 text-center">
          <p className="text-sm text-ui-text-secondary">
            Aucun fichier cree pour l'instant. Demandez a votre agent de creer un site web ou un document dans le chat.
          </p>
        </div>
      )}

      {/* Preview iframe */}
      {previewPath && (
        <div className="mb-6">
          <div className="flex items-center justify-between px-4 py-2 bg-ui-bg-tertiary border border-ui-border rounded-t-lg">
            <span className="text-xs font-medium text-ui-text-primary">Apercu : {previewPath}</span>
            <div className="flex gap-2">
              <a
                href={getFileUrl(previewPath)}
                target="_blank"
                className="text-xs text-brand-violet hover:underline"
              >
                Ouvrir dans un nouvel onglet
              </a>
              <button
                onClick={() => setPreviewPath(null)}
                className="text-xs text-ui-text-tertiary hover:text-ui-text-primary"
              >
                Fermer
              </button>
            </div>
          </div>
          <iframe
            src={getFileUrl(previewPath)}
            className="w-full border border-t-0 border-ui-border rounded-b-lg bg-white"
            style={{ height: '500px' }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}

      {/* User files */}
      {userFiles.length > 0 && (
        <div className="mb-8">
          <h2 className="text-md font-medium text-ui-text-primary mb-3">Fichiers crees</h2>
          <div className="border border-ui-border rounded-lg overflow-hidden">
            {userFiles.map((file, i) => (
              <div
                key={file.path}
                className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-ui-border' : ''} hover:bg-ui-bg-tertiary transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm">
                    {isHtml(file.name) ? '🌐' : ext(file.name) === '.css' ? '🎨' : ext(file.name) === '.js' ? '⚙' : '📄'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ui-text-primary truncate">{file.name}</p>
                    <p className="text-[10px] text-ui-text-tertiary">{file.path} — {formatSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {isPreviewable(file.name) && (
                    <button
                      onClick={() => setPreviewPath(file.path)}
                      className="px-3 py-1 text-xs font-medium rounded-md bg-brand-violet text-white hover:bg-brand-violet-dark transition-colors"
                    >
                      {isHtml(file.name) ? 'Voir le site' : 'Apercu'}
                    </button>
                  )}
                  <a
                    href={getFileUrl(file.path)}
                    target="_blank"
                    className="px-3 py-1 text-xs font-medium rounded-md border border-ui-border text-ui-text-secondary hover:bg-ui-bg-tertiary transition-colors"
                  >
                    Ouvrir
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System files */}
      {systemFiles.length > 0 && (
        <div>
          <h2 className="text-md font-medium text-ui-text-primary mb-3">Fichiers systeme</h2>
          <div className="border border-ui-border rounded-lg overflow-hidden">
            {systemFiles.map((file, i) => (
              <div
                key={file.path}
                className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-ui-border' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ui-text-tertiary">📝</span>
                  <p className="text-xs text-ui-text-secondary">{file.name}</p>
                </div>
                <span className="text-[10px] text-ui-text-tertiary">{formatSize(file.size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
