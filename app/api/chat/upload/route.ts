import { NextRequest, NextResponse } from 'next/server'
import { getCurrentBusinessId } from '@/lib/auth'
import { getOpenClawInstance } from '@/lib/openclaw/manager'
import { orchestrator } from '@/lib/orchestrator'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB
const WORKSPACE = '/home/node/.openclaw/workspace'

function detectMime(buf: Buffer): string | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif'
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'application/pdf'
  return null
}

export async function POST(req: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })

    const instance = await getOpenClawInstance(businessId)
    if (!instance) return NextResponse.json({ error: 'Agent non déployé' }, { status: 400 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop gros (${Math.round(file.size / 1024 / 1024)} MB, max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)` },
        { status: 413 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const detected = detectMime(buffer)
    if (!detected) {
      return NextResponse.json(
        { error: 'Type de fichier non supporté (PNG, JPEG, GIF, WebP, PDF uniquement)' },
        { status: 415 },
      )
    }
    if (file.type && file.type !== detected) {
      return NextResponse.json(
        { error: `Incohérence type fichier (annoncé ${file.type}, détecté ${detected})` },
        { status: 400 },
      )
    }

    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `${timestamp}-${safeName}`
    const relativePath = `uploads/${filename}`

    // Write file into the workspace container via base64 pipe
    const b64 = buffer.toString('base64')
    await orchestrator.exec(instance.containerName, [
      'sh', '-c', `mkdir -p ${WORKSPACE}/uploads && echo '${b64}' | base64 -d > ${WORKSPACE}/${relativePath}`,
    ])

    const isImage = detected.startsWith('image/')

    return NextResponse.json({
      path: relativePath,
      name: file.name,
      size: file.size,
      type: detected,
      ...(isImage && { dataUrl: `data:${detected};base64,${buffer.toString('base64')}` }),
    })
  } catch (error) {
    console.error('[chat/upload]', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
