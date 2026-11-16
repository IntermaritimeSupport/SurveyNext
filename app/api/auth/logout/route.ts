// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withCors } from '@/lib/cors'
import { SESSION_COOKIE } from '@/lib/session'

// Preflight request (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, {
    status: 200,
    headers: withCors(origin),
  })
}

// POST /api/auth/logout - Endpoint para cerrar sesión
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  try {
    (await cookies()).delete(SESSION_COOKIE);
    return NextResponse.json(
      { message: 'Sesión cerrada exitosamente' },
      { status: 200, headers: withCors(origin) }
    )
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500, headers: withCors(origin) }
    )
  }
}
