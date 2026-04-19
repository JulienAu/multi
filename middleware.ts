import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/dashboard', '/business-md', '/scorecard', '/agents', '/chat', '/files', '/preview', '/admin']

// Pages accessible without early access
const PUBLIC_PATHS = ['/coming-soon', '/ars-coach']

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Coming-soon gate: block everything except public paths
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  if (!isPublic) {
    const hasAccess = req.cookies.get('multi_early_access')?.value === '1'
    if (!hasAccess) {
      return NextResponse.redirect(new URL('/coming-soon', req.url))
    }
  }

  // Redirect hidden pages to chat
  if (pathname === '/dashboard' || pathname === '/scorecard') {
    return NextResponse.redirect(new URL('/chat', req.url))
  }

  // Auth gate for protected paths
  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  const token = req.cookies.get('multi_session')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
}
