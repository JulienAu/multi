import { NextRequest, NextResponse } from 'next/server'
import { getCurrentBusinessId } from '@/lib/auth'
import { getOpenClawInstance } from '@/lib/openclaw/manager'
import { orchestrator } from '@/lib/orchestrator'
import { extname, join } from 'path'

const WORKSPACE = '/home/node/.openclaw/workspace'

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
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })

    const instance = await getOpenClawInstance(businessId)
    if (!instance) return NextResponse.json({ error: 'Agent non déployé' }, { status: 400 })

    const { path: pathSegments } = await params
    let filePath = pathSegments.join('/')

    if (filePath.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const name = instance.containerName

    // Check if path is a directory → serve index.html
    try {
      const check = await orchestrator.exec(name, ['test', '-d', `${WORKSPACE}/${filePath}`])
      if (check !== undefined) filePath = join(filePath, 'index.html')
    } catch { /* not a dir, continue */ }

    const content = await orchestrator.readFile(name, `${WORKSPACE}/${filePath}`)
    const ext = extname(filePath).toLowerCase()
    const mime = MIME_TYPES[ext] ?? 'application/octet-stream'

    const cacheControl = ext === '.html' || ext === '.htm' ? 'no-cache' : 'public, max-age=3600'

    return new Response(content, {
      headers: { 'Content-Type': mime, 'Cache-Control': cacheControl },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('No such file') || msg.includes('cat:')) {
      return new Response('404 Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } })
    }
    console.error('[openclaw/preview]', error)
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 })
  }
}
