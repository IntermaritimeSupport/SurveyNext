import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySession, type Role } from '@/lib/session'

const STAFF_ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'MODERATOR']
import { withCors } from '@/lib/cors'

// API endpoints reachable without a session (respondent flow + auth itself).
function isPublicApi(method: string, pathname: string): boolean {
  if (method === 'OPTIONS') return true
  if (pathname === '/api/auth/login' && method === 'POST') return true
  if (pathname === '/api/auth/logout' && method === 'POST') return true
  if (pathname === '/api/auth/me' && method === 'GET') return true // returns 401 itself when logged out
  if (pathname.startsWith('/api/public/') && method === 'GET') return true
  if (/^\/api\/surveys\/[^/]+\/responses\/?$/.test(pathname) && method === 'POST') return true
  return false
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isApi = pathname.startsWith('/api/')

  if (isApi && isPublicApi(req.method, pathname)) return NextResponse.next()

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (session && STAFF_ROLES.includes(session.role)) return NextResponse.next()

  if (isApi && session) {
    return NextResponse.json(
      { message: 'No autorizado' },
      { status: 403, headers: withCors(req.headers.get('origin')) },
    )
  }

  if (isApi) {
    return NextResponse.json(
      { message: 'No autenticado' },
      { status: 401, headers: withCors(req.headers.get('origin')) },
    )
  }

  // Admin pages: send to login, remembering where the user wanted to go.
  const loginUrl = new URL('/auth/login', req.url)
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
}
