import { NextResponse } from 'next/server'
import { getCurrentUser, getCurrentBusinessId } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const businessId = await getCurrentBusinessId()
  const business = businessId
    ? await db.query.businesses.findFirst({
        where: (b, { eq }) => eq(b.id, businessId),
      })
    : null

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      stripeCustomerId: user.stripeCustomerId,
    },
    business: business ? {
      id: business.id,
      name: business.name,
      plan: business.plan,
      subscriptionStatus: business.subscriptionStatus,
    } : null,
  })
}
