// app/api/users/[id]/route.ts
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

// GET /api/users/[id] - Obtener un usuario por ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const origin = request.headers.get('origin');
  const { id } = params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        surveys: { select: { id: true, title: true, customLink: true } },
        responses: { select: { id: true, survey: { select: { title: true } } } },
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404, headers: withCors(origin) });
    }
    return NextResponse.json(user, { status: 200, headers: withCors(origin) });
  } catch (error: any) {
    console.error('Error fetching user by ID:', error);
    return NextResponse.json({ message: 'Error al obtener usuario', details: error.message }, { status: 500, headers: withCors(origin) });
  }
}

// PUT /api/users/[id] - Actualizar un usuario por ID
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const origin = request.headers.get('origin');
  const { id } = params;
  try {
    const body = await request.json();
    const { name, email, password, role, status } = body;

    const dataToUpdate: any = { name, email, role, status };

    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser, { status: 200, headers: withCors(origin) });
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json({ message: 'El correo electrónico ya está registrado' }, { status: 409, headers: withCors(origin) });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Usuario no encontrado para actualizar' }, { status: 404, headers: withCors(origin) });
    }
    return NextResponse.json({ message: 'Error al actualizar usuario', details: error.message }, { status: 500, headers: withCors(origin) });
  }
}

// DELETE /api/users/[id] - Eliminar un usuario por ID
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const origin = request.headers.get('origin');
  const { id } = params;
  try {
    await prisma.user.delete({ where: { id } });
    return new NextResponse(null, { status: 204, headers: withCors(origin) });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Usuario no encontrado para eliminar' }, { status: 404, headers: withCors(origin) });
    }
    return NextResponse.json({ message: 'Error al eliminar usuario', details: error.message }, { status: 500, headers: withCors(origin) });
  }
}
