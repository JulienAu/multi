// Admin guard — checks if current user is an admin.
// Admin emails are configured via ADMIN_EMAILS env var (comma-separated).

import { getCurrentUserId } from './auth'
import { db } from './db'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export async function isAdmin(userId: string): Promise<boolean> {
  if (ADMIN_EMAILS.length === 0) return false
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
    columns: { email: true },
  })
  return !!user && ADMIN_EMAILS.includes(user.email.toLowerCase())
}

export async function requireAdmin(): Promise<string> {
  const userId = await getCurrentUserId()
  if (!userId) throw new AdminError('Non authentifié', 401)
  const admin = await isAdmin(userId)
  if (!admin) throw new AdminError('Accès refusé', 403)
  return userId
}

export class AdminError extends Error {
  public status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AdminError'
    this.status = status
  }
}
