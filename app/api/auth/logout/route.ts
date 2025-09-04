// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const allowedOrigins = [
  'http://localhost:3000',
  'https://survey-next-git-main-intermaritime.vercel.app',
  'https://surveys.intermaritime.org',
]

// Función auxiliar para CORS
function withCors(origin: string | null) {
  const isAllowed = origin && allowedOrigins.includes(origin)
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
  }
}

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
    (await cookies()).delete('token');
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
