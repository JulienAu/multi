import { NextRequest, NextResponse } from 'next/server'
import { getCurrentBusinessId } from '@/lib/auth'
import { getOpenClawInstance } from '@/lib/openclaw/manager'
import { readFile, stat, realpath } from 'fs/promises'
import { join, extname } from 'path'

async function safeResolve(workspaceDir: string, relativePath: string): Promise<string | null> {
  try {
    const resolved = await realpath(join(workspaceDir, relativePath))
    const workspaceReal = await realpath(workspaceDir)
    if (!resolved.startsWith(workspaceReal + '/') && resolved !== workspaceReal) return null
    return resolved
  } catch {
    return null
  }
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.map': 'application/json',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })
    }

    const instance = await getOpenClawInstance(businessId)
    if (!instance) {
      return NextResponse.json({ error: 'Agent non déployé' }, { status: 400 })
    }

    const { path: pathSegments } = await params
    const filePath = pathSegments.join('/')
    const workspaceDir = `/tmp/openclaw-homes/${instance.containerName}/workspace`

    const resolved = await safeResolve(workspaceDir, filePath)
    if (!resolved) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    // Try the exact path, then index.html if it's a directory
    let targetPath = resolved
    try {
      const s = await stat(resolved)
      if (s.isDirectory()) {
        const indexResolved = await safeResolve(workspaceDir, join(filePath, 'index.html'))
        if (indexResolved) targetPath = indexResolved
      }
    } catch {
      // File might not exist, will error below
    }

    const content = await readFile(targetPath)
    const ext = extname(targetPath).toLowerCase()
    const mime = MIME_TYPES[ext] ?? 'application/octet-stream'

    // Cache static assets, no-cache for HTML
    const cacheControl = ext === '.html' || ext === '.htm'
      ? 'no-cache'
      : 'public, max-age=3600'

    return new Response(content, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': cacheControl,
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new Response('404 Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } })
    }
    console.error('[openclaw/preview]', error)
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 })
  }
}
