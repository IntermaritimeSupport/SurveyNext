// Edge-safe session helpers (usable from middleware.ts and route handlers).
import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'token'
export const SESSION_MAX_AGE = 60 * 60 // 1h, in seconds

export type Role = 'SUPERADMIN' | 'ADMIN' | 'MODERATOR' | 'USER'

export interface SessionPayload {
  userId: string
  email: string
  role: Role
}

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET no está definido.')
  return new TextEncoder().encode(secret)
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey())
}

/** Returns the payload if the token is valid and not expired, otherwise null. */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] })
    if (typeof payload.userId !== 'string' || typeof payload.role !== 'string') return null
    return { userId: payload.userId, email: String(payload.email ?? ''), role: payload.role as Role }
  } catch {
    return null
  }
}
