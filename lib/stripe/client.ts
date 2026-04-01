import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
  console.warn('[stripe] STRIPE_SECRET_KEY not configured — Stripe features disabled')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil' as Stripe.LatestApiVersion,
})
