import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { db, businesses, users } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'

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

  /**
   * Resolve the target business from either subscription metadata or customer fallback.
   * Subscriptions SHOULD be created with metadata.businessId.
   */
  const resolveBusinessId = async (sub: Stripe.Subscription): Promise<string | null> => {
    const metaId = (sub.metadata as Record<string, string> | null)?.businessId
    if (metaId) return metaId

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.stripeCustomerId, sub.customer as string),
      columns: { id: true },
    })
    if (!user) return null

    const fallback = await db.query.businesses.findFirst({
      where: (b, { eq }) => eq(b.userId, user.id),
      orderBy: [desc(businesses.createdAt)],
      columns: { id: true },
    })
    return fallback?.id ?? null
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const plan = getPlan(sub.items.data[0]?.price.id)
      const businessId = await resolveBusinessId(sub)
      if (!businessId) {
        console.error('[stripe/webhook] no matching business for sub', sub.id)
        break
      }
      await db.update(businesses).set({
        stripeSubscriptionId: sub.id,
        subscriptionStatus: sub.status as 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete',
        plan: plan ?? undefined,
        subscriptionCurrentPeriodEnd: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000),
        updatedAt: new Date(),
      }).where(eq(businesses.id, businessId))
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await db.update(businesses).set({
        subscriptionStatus: 'canceled',
        plan: null,
        updatedAt: new Date(),
      }).where(eq(businesses.stripeSubscriptionId, sub.id))
      break
    }
    case 'customer.created': {
      const customer = event.data.object as Stripe.Customer
      if (customer.email) {
        await db.update(users)
          .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
          .where(eq(users.email, customer.email))
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
