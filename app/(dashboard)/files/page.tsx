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
const HIDDEN_FILES = ['update-check.json']

const SYSTEM_DESCRIPTIONS: Record<string, string> = {
  'AGENTS.md': 'Instructions et role de l\'agent',
  'SOUL.md': 'Resume du BUSINESS.md pour le contexte',
  'BUSINESS.md': 'Votre document strategique',
  'TOOLS.md': 'Outils disponibles pour l\'agent',
  'USER.md': 'Profil utilisateur',
  'IDENTITY.md': 'Identite de l\'agent',
  'BOOTSTRAP.md': 'Configuration de demarrage',
  'HEARTBEAT.md': 'Etat du dernier heartbeat',
}

const FILE_ICONS: Record<string, string> = {
  '.html': '🌐', '.htm': '🌐', '.css': '🎨', '.js': '⚙', '.json': '{}',
  '.md': '📝', '.txt': '📄', '.png': '🖼', '.jpg': '🖼', '.svg': '🎨',
  '.pdf': '📕',
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDir, setCurrentDir] = useState('')
  const [previewPath, setPreviewPath] = useState<string | null>(null)
  const [editingFile, setEditingFile] = useState<{ path: string; name: string } | null>(null)
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
  const getDownloadUrl = (path: string) => `/api/openclaw/files?path=${encodeURIComponent(path)}&download=true`
  const getZipUrl = (path: string) => `/api/openclaw/files?path=${encodeURIComponent(path)}&zip=true`
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

  // Build tree: entries in current directory
  const getDirectoryContents = () => {
    const dirs = new Map<string, { fileCount: number; totalSize: number }>()
    const currentFiles: FileEntry[] = []

    for (const f of files) {
      if (HIDDEN_FILES.includes(f.name)) continue
      const relativePath = currentDir ? f.path.slice(currentDir.length + 1) : f.path
      if (!relativePath || (currentDir && !f.path.startsWith(currentDir + '/'))) continue
      if (!currentDir && f.path.includes('/') === false && !f.isDir) {
        // Root-level file
        currentFiles.push(f)
        continue
      }
      if (currentDir && !relativePath.includes('/') && !f.isDir) {
        // File in current dir
        currentFiles.push(f)
        continue
      }

      // It's inside a subdirectory
      const parts = relativePath.split('/')
      const dirName = parts[0]
      if (!dirName) continue
      const existing = dirs.get(dirName) ?? { fileCount: 0, totalSize: 0 }
      if (!f.isDir) {
        existing.fileCount++
        existing.totalSize += f.size
      }
      dirs.set(dirName, existing)
    }

    // For root level, include files without path separators
    if (!currentDir) {
      for (const f of files) {
        if (HIDDEN_FILES.includes(f.name)) continue
        if (!f.isDir && !f.path.includes('/')) {
          if (!currentFiles.find(cf => cf.path === f.path)) {
            currentFiles.push(f)
          }
        }
      }
    }

    return { dirs, files: currentFiles }
  }

  const { dirs, files: currentFiles } = loading ? { dirs: new Map(), files: [] } : getDirectoryContents()

  // Delete file or folder
  const deleteFile = async (path: string, name: string, isDir: boolean) => {
    if (!confirm(`Supprimer ${isDir ? 'le dossier' : 'le fichier'} "${name}" ?`)) return
    await fetch('/api/openclaw/files', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    if (editingFile?.path === path) setEditingFile(null)
    if (previewPath === path) setPreviewPath(null)
    fetchFiles()
  }

  // Breadcrumb
  const breadcrumbs = currentDir ? currentDir.split('/') : []

  const navigateToDir = (dir: string) => {
    setCurrentDir(dir)
    setPreviewPath(null)
    setEditingFile(null)
  }

  const navigateToBreadcrumb = (index: number) => {
    if (index < 0) {
      navigateToDir('')
    } else {
      navigateToDir(breadcrumbs.slice(0, index + 1).join('/'))
    }
  }

  // Editor
  const openEditor = async (file: FileEntry) => {
    const res = await fetch(getFileUrl(file.path))
    const content = await res.text()
    setEditingFile({ path: file.path, name: file.name })
    setEditContent(content)
    setSaveStatus('idle')
    setPreviewPath(null)
  }

  const saveFile = useCallback(async (path: string, content: string) => {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/openclaw/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      })
      if (res.ok) { setSaveStatus('saved'); fetchFiles() }
    } catch { setSaveStatus('idle') }
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

  useEffect(() => { return () => { if (debounceRef.current) clearTimeout(debounceRef.current) } }, [])

  // Separate system .md files at root
  const systemFiles = currentDir === '' ? currentFiles.filter(f => f.name.endsWith('.md') && SYSTEM_DESCRIPTIONS[f.name]) : []
  const regularFiles = currentDir === '' ? currentFiles.filter(f => !(f.name.endsWith('.md') && SYSTEM_DESCRIPTIONS[f.name])) : currentFiles

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-medium text-ui-text-primary mb-1">Fichiers de l'agent</h1>
      <p className="text-sm text-ui-text-secondary mb-4">
        Explorez le workspace de votre agent OpenClaw.
      </p>

      {loading && <p className="text-sm text-ui-text-tertiary">Chargement...</p>}

      {/* Breadcrumb */}
      {!loading && (
        <div className="flex items-center gap-1 mb-4 text-xs">
          <button
            onClick={() => navigateToBreadcrumb(-1)}
            className={`px-2 py-1 rounded transition-colors ${!currentDir ? 'text-brand-violet font-medium bg-brand-violet-light' : 'text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-tertiary'}`}
          >
            workspace
          </button>
          {breadcrumbs.map((part, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-ui-text-tertiary">/</span>
              <button
                onClick={() => navigateToBreadcrumb(i)}
                className={`px-2 py-1 rounded transition-colors ${i === breadcrumbs.length - 1 ? 'text-brand-violet font-medium bg-brand-violet-light' : 'text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-tertiary'}`}
              >
                {part}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Editor panel */}
      {editingFile && (
        <div className="mb-6 border border-ui-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-ui-bg-tertiary border-b border-ui-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-ui-text-primary">{editingFile.name}</span>
              <span className="text-[10px] text-ui-text-tertiary">{editingFile.path}</span>
              <span className={`text-[10px] ${saveStatus === 'saving' ? 'text-yellow-600' : saveStatus === 'saved' ? 'text-brand-green' : 'text-ui-text-tertiary'}`}>
                {saveStatus === 'saving' ? 'Sauvegarde...' : saveStatus === 'saved' ? 'Sauvegarde' : ''}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveNow} className="px-3 py-1 text-xs font-medium rounded-md bg-brand-violet text-white hover:bg-brand-violet-dark transition-colors">Sauvegarder</button>
              <button onClick={() => { handleSaveNow(); setEditingFile(null) }} className="px-3 py-1 text-xs text-ui-text-tertiary hover:text-ui-text-primary transition-colors">Fermer</button>
            </div>
          </div>
          <textarea value={editContent} onChange={e => handleEditChange(e.target.value)} className="w-full p-4 font-mono text-xs text-ui-text-primary leading-relaxed bg-ui-bg-secondary focus:outline-none resize-none" style={{ minHeight: '400px' }} spellCheck={false} />
        </div>
      )}

      {/* Preview iframe */}
      {previewPath && !editingFile && (
        <div className="mb-6">
          <div className="flex items-center justify-between px-4 py-2 bg-ui-bg-tertiary border border-ui-border rounded-t-lg">
            <span className="text-xs font-medium text-ui-text-primary">Apercu : {previewPath}</span>
            <div className="flex gap-2">
              <a href={getFileUrl(previewPath)} target="_blank" className="text-xs text-brand-violet hover:underline">Nouvel onglet</a>
              <button onClick={() => setPreviewPath(null)} className="text-xs text-ui-text-tertiary hover:text-ui-text-primary">Fermer</button>
            </div>
          </div>
          <iframe src={getFileUrl(previewPath)} className="w-full border border-t-0 border-ui-border rounded-b-lg bg-white" style={{ height: '500px' }} sandbox="allow-scripts allow-same-origin" />
        </div>
      )}

      {/* System files (root only) */}
      {systemFiles.length > 0 && !editingFile && !previewPath && (
        <div className="mb-6">
          <h2 className="text-md font-medium text-ui-text-primary mb-1">Fichiers systeme</h2>
          <p className="text-xs text-ui-text-tertiary mb-3">Definissent le comportement de votre agent.</p>
          <div className="border border-ui-border rounded-lg overflow-hidden">
            {systemFiles.map((file, i) => (
              <div key={file.path} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-ui-border' : ''} hover:bg-ui-bg-tertiary transition-colors`}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm">📝</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ui-text-primary">{file.name}</p>
                    <p className="text-[10px] text-ui-text-tertiary">{SYSTEM_DESCRIPTIONS[file.name]} — {formatSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEditor(file)} className="px-3 py-1 text-xs font-medium rounded-md bg-brand-violet-light text-brand-violet hover:bg-brand-violet hover:text-white transition-colors">Editer</button>
                  <button onClick={() => setPreviewPath(file.path)} className="px-3 py-1 text-xs font-medium rounded-md border border-ui-border text-ui-text-secondary hover:bg-ui-bg-tertiary transition-colors">Lire</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Directories + files */}
      {!loading && (dirs.size > 0 || regularFiles.length > 0) && (
        <div className="mb-6">
          {currentDir === '' && <h2 className="text-md font-medium text-ui-text-primary mb-3">Fichiers et dossiers</h2>}
          <div className="border border-ui-border rounded-lg overflow-hidden">
            {/* Back button */}
            {currentDir && (
              <button
                onClick={() => {
                  const parts = currentDir.split('/')
                  parts.pop()
                  navigateToDir(parts.join('/'))
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-ui-text-secondary hover:bg-ui-bg-tertiary transition-colors border-b border-ui-border"
              >
                <span>←</span>
                <span>..</span>
              </button>
            )}

            {/* Directories */}
            {Array.from(dirs.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([dirName, info], i) => (
              <button
                key={`dir-${dirName}`}
                onClick={() => navigateToDir(currentDir ? `${currentDir}/${dirName}` : dirName)}
                className={`group w-full flex items-center justify-between px-4 py-2.5 hover:bg-ui-bg-tertiary transition-colors ${(i > 0 || currentDir) ? 'border-t border-ui-border' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm">📁</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-ui-text-primary">{dirName}</p>
                    <p className="text-[10px] text-ui-text-tertiary">{info.fileCount} fichier{info.fileCount > 1 ? 's' : ''} — {formatSize(info.totalSize)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={getZipUrl(currentDir ? `${currentDir}/${dirName}` : dirName)}
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-[10px] font-medium rounded bg-ui-bg-tertiary text-ui-text-secondary hover:bg-ui-bg transition-all"
                    title="Telecharger en ZIP"
                  >
                    ZIP
                  </a>
                  <button onClick={(e) => { e.stopPropagation(); deleteFile(currentDir ? `${currentDir}/${dirName}` : dirName, dirName, true) }} className="opacity-0 group-hover:opacity-100 text-ui-text-tertiary hover:text-status-error transition-all p-0.5" title="Supprimer">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                  <span className="text-ui-text-tertiary text-xs">→</span>
                </div>
              </button>
            ))}

            {/* Files */}
            {regularFiles.sort((a, b) => a.name.localeCompare(b.name)).map((file, i) => (
              <div
                key={file.path}
                className={`flex items-center justify-between px-4 py-2.5 hover:bg-ui-bg-tertiary transition-colors ${(i > 0 || dirs.size > 0 || currentDir) ? 'border-t border-ui-border' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm">{FILE_ICONS[ext(file.name)] ?? '📄'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ui-text-primary truncate">{file.name}</p>
                    <p className="text-[10px] text-ui-text-tertiary">{formatSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {isEditable(file.name) && (
                    <button onClick={() => openEditor(file)} className="px-3 py-1 text-xs font-medium rounded-md bg-brand-violet-light text-brand-violet hover:bg-brand-violet hover:text-white transition-colors">Editer</button>
                  )}
                  {isHtml(file.name) && (
                    <a href={`/preview?path=${encodeURIComponent(file.path)}`} className="px-3 py-1 text-xs font-medium rounded-md bg-brand-violet text-white hover:bg-brand-violet-dark transition-colors">
                      Voir le site
                    </a>
                  )}
                  {isPreviewable(file.name) && !isHtml(file.name) && (
                    <button onClick={() => setPreviewPath(file.path)} className="px-3 py-1 text-xs font-medium rounded-md bg-brand-violet text-white hover:bg-brand-violet-dark transition-colors">
                      Apercu
                    </button>
                  )}
                  <a href={getDownloadUrl(file.path)} className="px-3 py-1 text-xs font-medium rounded-md border border-ui-border text-ui-text-secondary hover:bg-ui-bg-tertiary transition-colors">Telecharger</a>
                  <button onClick={() => deleteFile(file.path, file.name, false)} className="px-2 py-1 text-xs text-ui-text-tertiary hover:text-status-error transition-colors" title="Supprimer">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && dirs.size === 0 && regularFiles.length === 0 && systemFiles.length === 0 && (
        <div className="rounded-lg border border-ui-border bg-ui-bg-secondary p-6 text-center">
          <p className="text-sm text-ui-text-secondary">
            {currentDir ? 'Ce dossier est vide.' : 'Aucun fichier. Demandez a votre agent de creer des fichiers dans le chat.'}
          </p>
        </div>
      )}
    </div>
  )
}
