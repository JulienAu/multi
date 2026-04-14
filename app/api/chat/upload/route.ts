import { NextRequest, NextResponse } from 'next/server'
import { getCurrentBusinessId } from '@/lib/auth'
import { getOpenClawInstance } from '@/lib/openclaw/manager'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(req: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })

    const instance = await getOpenClawInstance(businessId)
    if (!instance) return NextResponse.json({ error: 'Agent non déployé' }, { status: 400 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Save to workspace/uploads/
    const workspaceDir = `/tmp/openclaw-homes/${instance.containerName}/workspace`
    const uploadsDir = join(workspaceDir, 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Unique filename to avoid conflicts
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `${timestamp}-${safeName}`
    const filePath = join(uploadsDir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const relativePath = `uploads/${filename}`
    const isImage = file.type.startsWith('image/')

    return NextResponse.json({
      path: relativePath,
      name: file.name,
      size: file.size,
      type: file.type,
      // For images, include base64 data URL for multimodal LLM
      ...(isImage && { dataUrl: `data:${file.type};base64,${buffer.toString('base64')}` }),
    })
  } catch (error) {
    console.error('[chat/upload]', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
