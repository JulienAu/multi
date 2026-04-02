'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

interface FileEntry {
  name: string
  path: string
  size: number
  isDir: boolean
}

const PREVIEWABLE = ['.html', '.htm', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.txt', '.md', '.css', '.js', '.json']
const EDITABLE = ['.md', '.txt', '.html', '.css', '.js', '.json']

export default function FilesPage() {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [previewPath, setPreviewPath] = useState<string | null>(null)
  const [editingFile, setEditingFile] = useState<{ path: string; name: string; content: string } | null>(null)
  const [editContent, setEditContent] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchFiles = useCallback(() => {
    fetch('/api/openclaw/files')
      .then(r => r.json())
      .then(d => { setFiles(d.files ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  const getFileUrl = (path: string) => `/api/openclaw/files?path=${encodeURIComponent(path)}`
  const ext = (name: string) => '.' + name.split('.').pop()?.toLowerCase()
  const isPreviewable = (name: string) => PREVIEWABLE.includes(ext(name))
  const isEditable = (name: string) => EDITABLE.includes(ext(name))
  const isHtml = (name: string) => ['.html', '.htm'].includes(ext(name))
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '--'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Open file for editing
  const openEditor = async (file: FileEntry) => {
    const res = await fetch(getFileUrl(file.path))
    const content = await res.text()
    setEditingFile({ path: file.path, name: file.name, content })
    setEditContent(content)
    setSaveStatus('idle')
    setPreviewPath(null) // close preview if open
  }

  // Save with debounce
  const saveFile = useCallback(async (path: string, content: string) => {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/openclaw/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      })
      if (res.ok) {
        setSaveStatus('saved')
        fetchFiles() // refresh sizes
      }
    } catch {
      setSaveStatus('idle')
    }
  }, [fetchFiles])

  const handleEditChange = (value: string) => {
    setEditContent(value)
    setSaveStatus('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (editingFile) saveFile(editingFile.path, value)
    }, 2000)
  }

  const handleSaveNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (editingFile) saveFile(editingFile.path, editContent)
  }

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const userFiles = files.filter(f => !f.isDir && !f.name.endsWith('.md') && f.name !== 'update-check.json')
  const systemFiles = files.filter(f => !f.isDir && f.name.endsWith('.md'))

  const SYSTEM_FILE_DESCRIPTIONS: Record<string, string> = {
    'AGENTS.md': 'Instructions et role de l\'agent',
    'SOUL.md': 'BUSINESS.md injecte comme contexte',
    'BUSINESS.md': 'Votre document strategique',
    'TOOLS.md': 'Outils disponibles pour l\'agent',
    'USER.md': 'Profil utilisateur',
    'IDENTITY.md': 'Identite de l\'agent',
    'BOOTSTRAP.md': 'Configuration de demarrage',
    'HEARTBEAT.md': 'Etat du dernier heartbeat',
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-medium text-ui-text-primary mb-1">Fichiers de l'agent</h1>
      <p className="text-sm text-ui-text-secondary mb-6">
        Fichiers du workspace OpenClaw. Editez les fichiers systeme pour personnaliser le comportement de votre agent.
      </p>

      {loading && <p className="text-sm text-ui-text-tertiary">Chargement...</p>}

      {/* Editor panel */}
      {editingFile && (
        <div className="mb-6 border border-ui-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-ui-bg-tertiary border-b border-ui-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-ui-text-primary">{editingFile.name}</span>
              <span className="text-[10px] text-ui-text-tertiary">{editingFile.path}</span>
              <span className={`text-[10px] ${
                saveStatus === 'saving' ? 'text-yellow-600' :
                saveStatus === 'saved' ? 'text-brand-green' : 'text-ui-text-tertiary'
              }`}>
                {saveStatus === 'saving' ? 'Sauvegarde...' : saveStatus === 'saved' ? 'Sauvegarde' : ''}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveNow}
                className="px-3 py-1 text-xs font-medium rounded-md bg-brand-violet text-white hover:bg-brand-violet-dark transition-colors"
              >
                Sauvegarder
              </button>
              <button
                onClick={() => { handleSaveNow(); setEditingFile(null) }}
                className="px-3 py-1 text-xs text-ui-text-tertiary hover:text-ui-text-primary transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
          <textarea
            value={editContent}
            onChange={e => handleEditChange(e.target.value)}
            className="w-full p-4 font-mono text-xs text-ui-text-primary leading-relaxed bg-ui-bg-secondary focus:outline-none resize-none"
            style={{ minHeight: '400px' }}
            spellCheck={false}
          />
        </div>
      )}

      {/* Preview iframe */}
      {previewPath && !editingFile && (
        <div className="mb-6">
          <div className="flex items-center justify-between px-4 py-2 bg-ui-bg-tertiary border border-ui-border rounded-t-lg">
            <span className="text-xs font-medium text-ui-text-primary">Apercu : {previewPath}</span>
            <div className="flex gap-2">
              <a href={getFileUrl(previewPath)} target="_blank" className="text-xs text-brand-violet hover:underline">
                Ouvrir dans un nouvel onglet
              </a>
              <button onClick={() => setPreviewPath(null)} className="text-xs text-ui-text-tertiary hover:text-ui-text-primary">
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

      {/* System files — now first, with edit buttons */}
      {systemFiles.length > 0 && (
        <div className="mb-8">
          <h2 className="text-md font-medium text-ui-text-primary mb-1">Fichiers systeme</h2>
          <p className="text-xs text-ui-text-tertiary mb-3">
            Ces fichiers definissent le comportement de votre agent. Modifiez-les pour personnaliser ses instructions.
          </p>
          <div className="border border-ui-border rounded-lg overflow-hidden">
            {systemFiles.map((file, i) => (
              <div
                key={file.path}
                className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-ui-border' : ''} hover:bg-ui-bg-tertiary transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm">📝</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ui-text-primary">{file.name}</p>
                    <p className="text-[10px] text-ui-text-tertiary">
                      {SYSTEM_FILE_DESCRIPTIONS[file.name] ?? file.path} — {formatSize(file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEditor(file)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      editingFile?.path === file.path
                        ? 'bg-brand-violet text-white'
                        : 'bg-brand-violet-light text-brand-violet hover:bg-brand-violet hover:text-white'
                    }`}
                  >
                    {editingFile?.path === file.path ? 'En cours...' : 'Editer'}
                  </button>
                  <button
                    onClick={() => setPreviewPath(file.path)}
                    className="px-3 py-1 text-xs font-medium rounded-md border border-ui-border text-ui-text-secondary hover:bg-ui-bg-tertiary transition-colors"
                  >
                    Lire
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User files */}
      {!loading && userFiles.length === 0 && (
        <div className="mb-8 rounded-lg border border-ui-border bg-ui-bg-secondary p-6 text-center">
          <p className="text-sm text-ui-text-secondary">
            Aucun fichier cree pour l'instant. Demandez a votre agent de creer un site web ou un document dans le chat.
          </p>
        </div>
      )}

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
                  {isEditable(file.name) && (
                    <button
                      onClick={() => openEditor(file)}
                      className="px-3 py-1 text-xs font-medium rounded-md bg-brand-violet-light text-brand-violet hover:bg-brand-violet hover:text-white transition-colors"
                    >
                      Editer
                    </button>
                  )}
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
    </div>
  )
}
