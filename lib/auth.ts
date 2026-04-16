import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { db, users, businesses, wizardSessions, businessDocs, leads } from '@/lib/db'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required')
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)
const COOKIE_NAME = 'multi_session'
const BUSINESS_COOKIE = 'multi_business_id'

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
}

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
    ...COOKIE_BASE,
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  cookieStore.delete(BUSINESS_COOKIE)
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

// ─── BUSINESS CONTEXT ───────────────────────────────────────────────────────

/**
 * Retourne l'id du business actif pour le user courant.
 * - Lit le cookie `multi_business_id` et valide l'ownership.
 * - Fallback : premier business actif du user (le plus récent).
 * - null si user anon ou pas de business.
 * Ne modifie pas le cookie (pour être safe en server components).
 */
export async function getCurrentBusinessId(): Promise<string | null> {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const cookieStore = await cookies()
  const cookieVal = cookieStore.get(BUSINESS_COOKIE)?.value

  if (cookieVal) {
    const owned = await db.query.businesses.findFirst({
      where: (b, { eq, and }) => and(eq(b.id, cookieVal), eq(b.userId, userId)),
      columns: { id: true },
    })
    if (owned) return owned.id
  }

  const first = await db.query.businesses.findFirst({
    where: (b, { eq, and }) => and(eq(b.userId, userId), eq(b.status, 'active')),
    orderBy: (b, { desc }) => [desc(b.createdAt)],
    columns: { id: true },
  })
  return first?.id ?? null
}

export async function setCurrentBusinessId(businessId: string): Promise<boolean> {
  const userId = await getCurrentUserId()
  if (!userId) return false

  const owned = await db.query.businesses.findFirst({
    where: (b, { eq, and }) => and(eq(b.id, businessId), eq(b.userId, userId)),
    columns: { id: true },
  })
  if (!owned) return false

  const cookieStore = await cookies()
  cookieStore.set(BUSINESS_COOKIE, businessId, {
    ...COOKIE_BASE,
    maxAge: 60 * 60 * 24 * 30,
  })
  return true
}

export async function clearBusinessCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(BUSINESS_COOKIE)
}

// ─── AUTH ACTIONS ───────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, firstName?: string) {
  const existing = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  })
  if (existing) {
    // Message générique anti-enumeration — ne pas révéler si l'email existe.
    // TODO : quand le flow email-verification sera en place, envoyer un mail
    // "tentative de réinscription" au propriétaire et retourner le même message
    // que pour une vraie inscription réussie.
    throw new AuthError('Inscription impossible. Essaie de te connecter ou contacte le support.')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const [user] = await db.insert(users).values({
    email,
    passwordHash,
    firstName: firstName ?? null,
  }).returning()

  const businessId = await claimExistingData(user.id, email)

  await setSession(user.id)
  if (businessId) {
    const cookieStore = await cookies()
    cookieStore.set(BUSINESS_COOKIE, businessId, {
      ...COOKIE_BASE,
      maxAge: 60 * 60 * 24 * 30,
    })
  }
  return user
}

/**
 * Après inscription, rattache au nouveau user les données anon créées
 * avant le compte (wizard sessions + leads, identifiés par email).
 * Crée un business par wizard session trouvée.
 * Retourne l'id du business créé le plus récemment (à utiliser comme business actif).
 */
async function claimExistingData(userId: string, email: string): Promise<string | null> {
  let lastBusinessId: string | null = null
  try {
    const sessionsWithEmail = await db.query.wizardSessions.findMany({
      where: (s, { eq }) => eq(s.email, email),
    })

    for (const session of sessionsWithEmail) {
      await db.update(wizardSessions)
        .set({ userId, updatedAt: new Date() })
        .where(eq(wizardSessions.id, session.id))

      const answers = session.answers as Record<string, unknown> | null
      if (!answers) continue

      const [business] = await db.insert(businesses).values({
        userId,
        name: (answers.name as string) ?? 'Mon business',
      }).returning()
      lastBusinessId = business.id

      await db.update(wizardSessions)
        .set({ businessId: business.id })
        .where(eq(wizardSessions.id, session.id))

      const existingDoc = await db.query.businessDocs.findFirst({
        where: (d, { eq }) => eq(d.sessionId, session.id),
      })
      if (existingDoc) {
        await db.update(businessDocs)
          .set({ businessId: business.id })
          .where(eq(businessDocs.id, existingDoc.id))
      } else {
        const content = answers._generatedContent as string | undefined
        if (content) {
          await db.insert(businessDocs).values({
            businessId: business.id,
            sessionId: session.id,
            content,
            lineCount: content.split('\n').length,
            sectionCount: (content.match(/^## /gm) || []).length,
            sector: answers.sector as string,
            businessName: answers.name as string,
            generatedByModel: (answers._generatedModel as string) ?? 'unknown',
          })
        }
      }
    }

    await db.update(leads)
      .set({ convertedToUserId: userId, convertedAt: new Date() })
      .where(eq(leads.email, email))
  } catch (error) {
    console.error('[auth/claimExistingData]', error)
  }
  return lastBusinessId
}

// Hash dummy utilisé quand l'email n'existe pas, pour que le temps de réponse
// soit identique (timing attack anti-enumeration). Généré une seule fois.
const DUMMY_HASH = '$2b$10$zFvDnKkLN7E2kFLbCQJeqOiPrPn9vS7dvJ3jZQW0K/fRWh5ixHwzG'

export async function signIn(email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  })

  // Run bcrypt même si user inexistant pour normaliser le timing.
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)

  if (!user || !valid) {
    throw new AuthError('Email ou mot de passe incorrect')
  }

  await setSession(user.id)

  const firstBusiness = await db.query.businesses.findFirst({
    where: (b, { eq, and }) => and(eq(b.userId, user.id), eq(b.status, 'active')),
    orderBy: (b, { desc }) => [desc(b.createdAt)],
    columns: { id: true },
  })
  if (firstBusiness) {
    const cookieStore = await cookies()
    cookieStore.set(BUSINESS_COOKIE, firstBusiness.id, {
      ...COOKIE_BASE,
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  return user
}
