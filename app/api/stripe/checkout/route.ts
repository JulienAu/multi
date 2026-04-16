import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'
import { z } from 'zod'

const schema = z.object({
  priceId: z.string(),
  email: z.string().email().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const { priceId, email } = schema.parse(await req.json())

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?checkout=cancel`,
      ...(email && { customer_email: email }),
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe/checkout]', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
