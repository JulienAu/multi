import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const getPlan = (priceId: string) => {
    if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return 'starter' as const
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro' as const
    if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) return 'business' as const
    return null
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const plan = getPlan(sub.items.data[0]?.price.id)
      await db.update(users).set({
        stripeSubscriptionId: sub.id,
        subscriptionStatus: sub.status as 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete',
        plan: plan ?? undefined,
        subscriptionCurrentPeriodEnd: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000),
        updatedAt: new Date(),
      }).where(eq(users.stripeCustomerId, sub.customer as string))
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await db.update(users).set({
        subscriptionStatus: 'canceled',
        plan: undefined,
        updatedAt: new Date(),
      }).where(eq(users.stripeSubscriptionId, sub.id))
      break
    }
  }

  return NextResponse.json({ received: true })
}
