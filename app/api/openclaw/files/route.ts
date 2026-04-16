import { NextRequest, NextResponse } from 'next/server'
import { getCurrentBusinessId } from '@/lib/auth'
import { getOpenClawInstance } from '@/lib/openclaw/manager'
import { orchestrator } from '@/lib/orchestrator'
import { z } from 'zod'

const WORKSPACE = '/home/node/.openclaw/workspace'

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

async function requireInstance() {
  const businessId = await getCurrentBusinessId()
  if (!businessId) throw new Error('AUTH')
  const instance = await getOpenClawInstance(businessId)
  if (!instance) throw new Error('NO_INSTANCE')
  return { businessId, instance }
}

export async function GET(req: NextRequest) {
  try {
    const { instance } = await requireInstance()
    const name = instance.containerName
    const filePath = req.nextUrl.searchParams.get('path')

    if (!filePath) {
      const script = `node -e "const fs=require('fs'),p=require('path');function ls(d,r){try{const e=fs.readdirSync(d,{withFileTypes:true});const res=[];for(const f of e){const fp=p.join(d,f.name);const rp=fp.slice(r.length+1);if(f.isDirectory()){res.push({name:f.name,path:rp,size:0,isDir:true});res.push(...ls(fp,r))}else{try{const s=fs.statSync(fp);res.push({name:f.name,path:rp,size:s.size,isDir:false})}catch{}}}return res}catch{return[]}}console.log(JSON.stringify(ls('${WORKSPACE}','${WORKSPACE}')))"`
      const output = await orchestrator.exec(name, ['sh', '-c', script])
      const files = JSON.parse(output)
      return NextResponse.json({ files })
    }

    if (filePath.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const fullPath = `${WORKSPACE}/${filePath}`
    const content = await orchestrator.readFile(name, fullPath)
    const ext = filePath.includes('.') ? '.' + filePath.split('.').pop()!.toLowerCase() : ''
    const mime = MIME_TYPES[ext] ?? 'text/plain'

    const download = req.nextUrl.searchParams.get('download') === 'true'
    const headers: Record<string, string> = { 'Content-Type': mime }
    if (download) {
      const fileName = filePath.split('/').pop() || 'file'
      headers['Content-Disposition'] = `attachment; filename="${fileName}"`
    }

    return new Response(content, { headers })
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH')
      return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })
    if (error instanceof Error && error.message === 'NO_INSTANCE')
      return NextResponse.json({ error: 'Agent non déployé' }, { status: 400 })
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
    const { instance } = await requireInstance()
    const { path: filePath, content } = putSchema.parse(await req.json())

    if (filePath.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    await orchestrator.writeFile(instance.containerName, `${WORKSPACE}/${filePath}`, content)
    return NextResponse.json({ ok: true, path: filePath })
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH')
      return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })
    if (error instanceof Error && error.message === 'NO_INSTANCE')
      return NextResponse.json({ error: 'Agent non déployé' }, { status: 400 })
    console.error('[openclaw/files/put]', error)
    return NextResponse.json({ error: 'Failed to write file' }, { status: 500 })
  }
}

const deleteSchema = z.object({
  path: z.string().min(1),
})

export async function DELETE(req: NextRequest) {
  try {
    const { instance } = await requireInstance()
    const { path: filePath } = deleteSchema.parse(await req.json())

    if (filePath.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    await orchestrator.exec(instance.containerName, ['rm', '-rf', `${WORKSPACE}/${filePath}`])
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH')
      return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })
    if (error instanceof Error && error.message === 'NO_INSTANCE')
      return NextResponse.json({ error: 'Agent non déployé' }, { status: 400 })
    console.error('[openclaw/files/delete]', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
