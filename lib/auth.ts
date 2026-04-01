import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { db, users, wizardSessions, businessDocs, leads } from '@/lib/db'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'multi-dev-secret-change-in-prod'
)
const COOKIE_NAME = 'multi_session'

// ─── JWT ────────────────────────────────────────────────────────────────────

async function createToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(JWT_SECRET)
}

async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.userId as string
  } catch {
    return null
  }
}

// ─── SESSION ────────────────────────────────────────────────────────────────

export async function setSession(userId: string) {
  const token = await createToken(userId)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function getCurrentUser() {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
  })
  return user ?? null
}

// ─── AUTH ACTIONS ───────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, firstName?: string) {
  const existing = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  })
  if (existing) {
    throw new Error('Un compte existe déjà avec cet email')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const [user] = await db.insert(users).values({
    email,
    passwordHash,
    firstName: firstName ?? null,
  }).returning()

  // Rattacher les données existantes (wizard sessions, business docs, leads) via l'email
  await claimExistingData(user.id, email)

  await setSession(user.id)
  return user
}

/**
 * Après inscription, rattache au nouveau user toutes les données
 * créées avant le compte (identifiées par email dans leads/wizard_sessions).
 */
async function claimExistingData(userId: string, email: string) {
  try {
    // Trouver les sessions wizard liées à cet email
    const sessionsWithEmail = await db.query.wizardSessions.findMany({
      where: (s, { eq }) => eq(s.email, email),
    })

    const sessionIds = sessionsWithEmail.map(s => s.id)

    // Rattacher les sessions au user
    for (const sessionId of sessionIds) {
      await db.update(wizardSessions)
        .set({ userId, updatedAt: new Date() })
        .where(eq(wizardSessions.id, sessionId))

      // Rattacher les business docs liés à ces sessions
      await db.update(businessDocs)
        .set({ userId, updatedAt: new Date() })
        .where(eq(businessDocs.sessionId, sessionId))
    }

    // Rattacher les leads
    await db.update(leads)
      .set({ convertedToUserId: userId, convertedAt: new Date() })
      .where(eq(leads.email, email))
  } catch (error) {
    console.error('[auth/claimExistingData]', error)
  }
}

export async function signIn(email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  })
  if (!user) {
    throw new Error('Email ou mot de passe incorrect')
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    throw new Error('Email ou mot de passe incorrect')
  }

  await setSession(user.id)
  return user
}
