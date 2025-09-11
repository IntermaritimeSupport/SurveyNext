// app/api/public/survey-questions/[customlink]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const allowedOrigins = [
  'http://localhost:3000',
  'https://survey-next-git-main-intermaritime.vercel.app',
  'https://surveys.intermaritime.org',
];

// Función auxiliar para CORS
function withCors(origin: string | null) {
  const isAllowed = origin && allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Preflight request (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, {
    status: 200,
    headers: withCors(origin),
  });
}

export async function GET(request: Request) {
  const origin = request.headers.get('origin')
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
    });
    return NextResponse.json(users,{ status: 200, headers: withCors(origin) });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Error al obtener usuarios' }, { status: 500, headers: withCors(origin) });
  }
}

// POST /api/users - Crear un nuevo usuario
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password, role } = body;

    // Validación básica
    if (!email || !name || !password) {
      return NextResponse.json({ message: 'Faltan campos obligatorios (email, name, password)' }, { status: 400, headers: withCors(origin) });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || 'USER', // Establece USER por defecto si no se proporciona
        // Otros campos como status, createdAt, updatedAt, lastLogin se manejan por defecto
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201, headers: withCors(origin) });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json({ message: 'El correo electrónico ya está registrado' }, { status: 409, headers: withCors(origin) });
    }
    return NextResponse.json({ message: 'Error al crear usuario' }, { status: 500, headers: withCors(origin) });
  }
}