// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma'
import { withCors } from '@/lib/cors'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

// Preflight request (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, {
    status: 200,
    headers: withCors(origin),
  })
}

// GET /api/auth/me - Obtener información del usuario autenticado
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  try {
    const decodedToken = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!decodedToken) {
      return NextResponse.json(
        { message: 'No autenticado' },
        { status: 401, headers: withCors(origin) }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json(
        { message: 'Usuario no encontrado o inactivo' },
        { status: 401, headers: withCors(origin) }
      )
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200, headers: withCors(origin) }
    )
  } catch (error) {
    console.error('Error en /api/auth/me:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500, headers: withCors(origin) }
    )
  }
}
