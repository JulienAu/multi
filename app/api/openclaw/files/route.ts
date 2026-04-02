import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getOpenClawInstance } from '@/lib/openclaw/manager'
import { readFile, writeFile, readdir, stat, rm } from 'fs/promises'
import { join, extname } from 'path'
import { z } from 'zod'

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
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const instance = await getOpenClawInstance(userId)
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

    // Prevent path traversal
    const resolved = join(workspaceDir, filePath)
    if (!resolved.startsWith(workspaceDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const content = await readFile(resolved)
    const ext = extname(resolved).toLowerCase()
    const mime = MIME_TYPES[ext] ?? 'application/octet-stream'

    return new Response(content, {
      headers: { 'Content-Type': mime },
    })
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
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const instance = await getOpenClawInstance(userId)
    if (!instance) {
      return NextResponse.json({ error: 'Agent non déployé' }, { status: 400 })
    }

    const { path: filePath, content } = putSchema.parse(await req.json())
    const workspaceDir = `/tmp/openclaw-homes/${instance.containerName}/workspace`

    const resolved = join(workspaceDir, filePath)
    if (!resolved.startsWith(workspaceDir)) {
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
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const instance = await getOpenClawInstance(userId)
    if (!instance) {
      return NextResponse.json({ error: 'Agent non déployé' }, { status: 400 })
    }

    const { path: filePath } = deleteSchema.parse(await req.json())
    const workspaceDir = `/tmp/openclaw-homes/${instance.containerName}/workspace`

    const resolved = join(workspaceDir, filePath)
    if (!resolved.startsWith(workspaceDir)) {
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
