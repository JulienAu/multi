import { NextRequest, NextResponse } from 'next/server'
import { signUp } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères'),
  firstName: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const user = await signUp(body.email, body.password, body.firstName)

    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Inscription échouée'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
