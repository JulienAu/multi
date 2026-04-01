import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const user = await signIn(body.email, body.password)

    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Connexion échouée'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
