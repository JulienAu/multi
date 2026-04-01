import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getOpenClawInstance } from '@/lib/openclaw/manager'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const instance = await getOpenClawInstance(userId)
    if (!instance) {
      return NextResponse.json({ logs: null })
    }

    try {
      const { stdout } = await execFileAsync('docker', [
        'logs', '--tail', '30', instance.containerName,
      ], { timeout: 5000 })
      return NextResponse.json({ logs: stdout, status: instance.status })
    } catch (e: unknown) {
      // docker logs outputs to stderr for some images
      const stderr = (e as { stderr?: string }).stderr
      if (stderr) {
        return NextResponse.json({ logs: stderr, status: instance.status })
      }
      return NextResponse.json({ logs: null, status: instance.status })
    }
  } catch (error) {
    console.error('[openclaw/logs]', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
