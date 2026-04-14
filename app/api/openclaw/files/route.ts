import { NextRequest, NextResponse } from 'next/server'
import { getCurrentBusinessId } from '@/lib/auth'
import { getOpenClawInstance } from '@/lib/openclaw/manager'
import { readFile, writeFile, readdir, stat, rm, realpath } from 'fs/promises'
import { join, extname, basename } from 'path'

/**
 * Résout un chemin relatif au workspace en le normalisant contre les symlinks.
 * Protège contre un agent malveillant qui créerait `workspace/escape -> /etc/passwd`.
 */
async function safeResolve(workspaceDir: string, relativePath: string): Promise<string | null> {
  const raw = join(workspaceDir, relativePath)
  try {
    // realpath résout les symlinks sur le path existant.
    const resolved = await realpath(raw)
    const workspaceReal = await realpath(workspaceDir)
    if (!resolved.startsWith(workspaceReal + '/') && resolved !== workspaceReal) return null
    return resolved
  } catch {
    // Fichier n'existe pas encore (cas du PUT d'un nouveau fichier) :
    // on vérifie juste que le parent est dans le workspace.
    try {
      const parent = await realpath(join(raw, '..'))
      const workspaceReal = await realpath(workspaceDir)
      if (!parent.startsWith(workspaceReal + '/') && parent !== workspaceReal) return null
      return raw
    } catch {
      return null
    }
  }
}
import { z } from 'zod'
import archiver from 'archiver'
import { Readable } from 'stream'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
}

export async function GET(req: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })
    }

    const instance = await getOpenClawInstance(businessId)
    if (!instance) {
      return NextResponse.json({ error: 'Agent non déployé' }, { status: 400 })
    }

    const filePath = req.nextUrl.searchParams.get('path')
    const workspaceDir = `/tmp/openclaw-homes/${instance.containerName}/workspace`

    // List files if no path
    if (!filePath) {
      const files = await listFiles(workspaceDir, workspaceDir)
      return NextResponse.json({ files })
    }

    const resolved = await safeResolve(workspaceDir, filePath)
    if (!resolved) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const download = req.nextUrl.searchParams.get('download') === 'true'
    const zip = req.nextUrl.searchParams.get('zip') === 'true'

    // ZIP download for directories
    if (zip) {
      const s = await stat(resolved)
      if (!s.isDirectory()) {
        return NextResponse.json({ error: 'Not a directory' }, { status: 400 })
      }

      const archive = archiver('zip', { zlib: { level: 5 } })
      archive.directory(resolved, basename(resolved))
      archive.finalize()

      // Convert Node stream to Web ReadableStream
      const webStream = Readable.toWeb(archive) as ReadableStream
      const name = basename(resolved) + '.zip'

      return new Response(webStream, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${name}"`,
        },
      })
    }

    const content = await readFile(resolved)
    const ext = extname(resolved).toLowerCase()
    const mime = MIME_TYPES[ext] ?? 'application/octet-stream'

    const headers: Record<string, string> = { 'Content-Type': mime }
    if (download) {
      headers['Content-Disposition'] = `attachment; filename="${basename(resolved)}"`
    }

    return new Response(content, { headers })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    console.error('[openclaw/files]', error)
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
  }
}

const putSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
})

export async function PUT(req: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })
    }

    const instance = await getOpenClawInstance(businessId)
    if (!instance) {
      return NextResponse.json({ error: 'Agent non déployé' }, { status: 400 })
    }

    const { path: filePath, content } = putSchema.parse(await req.json())
    const workspaceDir = `/tmp/openclaw-homes/${instance.containerName}/workspace`

    const resolved = await safeResolve(workspaceDir, filePath)
    if (!resolved) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    await writeFile(resolved, content, 'utf-8')

    return NextResponse.json({ ok: true, path: filePath })
  } catch (error) {
    console.error('[openclaw/files/put]', error)
    return NextResponse.json({ error: 'Failed to write file' }, { status: 500 })
  }
}

const deleteSchema = z.object({
  path: z.string().min(1),
})

export async function DELETE(req: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })
    }

    const instance = await getOpenClawInstance(businessId)
    if (!instance) {
      return NextResponse.json({ error: 'Agent non déployé' }, { status: 400 })
    }

    const { path: filePath } = deleteSchema.parse(await req.json())
    const workspaceDir = `/tmp/openclaw-homes/${instance.containerName}/workspace`

    const resolved = await safeResolve(workspaceDir, filePath)
    if (!resolved) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    await rm(resolved, { recursive: true })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    console.error('[openclaw/files/delete]', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

async function listFiles(dir: string, root: string): Promise<{ name: string; path: string; size: number; isDir: boolean }[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const results: { name: string; path: string; size: number; isDir: boolean }[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    const relativePath = fullPath.slice(root.length + 1)

    if (entry.isDirectory()) {
      results.push({ name: entry.name, path: relativePath, size: 0, isDir: true })
      const sub = await listFiles(fullPath, root).catch(() => [])
      results.push(...sub)
    } else {
      const s = await stat(fullPath).catch(() => null)
      results.push({ name: entry.name, path: relativePath, size: s?.size ?? 0, isDir: false })
    }
  }

  return results
}
