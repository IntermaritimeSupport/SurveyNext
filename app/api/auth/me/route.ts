// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

// Define la interfaz para el payload del JWT
interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// GET /api/auth/me - Obtener información del usuario autenticado
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  try {
    const token = (await cookies()).get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'No autenticado' },
        { status: 401, headers: withCors(origin) }
      )
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET no está definido en las variables de entorno.');
    }

    let decodedToken: JwtPayload;
    try {
      decodedToken = jwt.verify(token, jwtSecret) as JwtPayload;
    } catch (jwtError) {
      console.error('Error al verificar el token JWT:', jwtError);
      return NextResponse.json(
        { message: 'Token inválido o expirado' },
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
