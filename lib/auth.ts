// Server-side authorization for route handlers (Node runtime: uses Prisma).
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withCors } from '@/lib/cors'
import { SESSION_COOKIE, verifySession, type Role } from '@/lib/session'

export const ADMIN_ROLES: Role[] = ['SUPERADMIN', 'ADMIN']
export const STAFF_ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'MODERATOR']

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
}

type AuthResult = { user: AuthUser; error?: never } | { user?: never; error: NextResponse }

/**
 * Verifies the session cookie, re-reads the user (must exist and be ACTIVE)
 * and optionally checks the role. On failure returns a ready-to-send 401/403.
 */
export async function requireUser(req: NextRequest | Request, roles: Role[] = STAFF_ROLES): Promise<AuthResult> {
  const origin = req.headers.get('origin')
  const token = (req as NextRequest).cookies?.get(SESSION_COOKIE)?.value ?? readCookie(req, SESSION_COOKIE)
  const session = await verifySession(token)
  if (!session) {
    return { error: NextResponse.json({ message: 'No autenticado' }, { status: 401, headers: withCors(origin) }) }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, status: true },
  })
  if (!user || user.status !== 'ACTIVE') {
    return { error: NextResponse.json({ message: 'Usuario no encontrado o inactivo' }, { status: 401, headers: withCors(origin) }) }
  }
  if (!roles.includes(user.role as Role)) {
    return { error: NextResponse.json({ message: 'No autorizado' }, { status: 403, headers: withCors(origin) }) }
  }
  return { user: { id: user.id, email: user.email, name: user.name, role: user.role as Role } }
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie')
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return undefined
}
