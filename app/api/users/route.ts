// app/api/public/survey-questions/[customlink]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
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

export async function GET(request: NextRequest) {
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
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  try {
    const body = await request.json();
    const { email, name, password, role: newUserRoleString } = body; // 'newUserRoleString' es el rol que se intenta asignar al nuevo usuario

    const requestingUserRoleHeader = request.headers.get('x-requester-role');
    let requestingUserRole: Role;

    if (!requestingUserRoleHeader) {
      return NextResponse.json({ message: 'No autorizado: Rol del solicitante no proporcionado.' }, { status: 401, headers: withCors(origin) });
    }

    // Validar que el rol del solicitante sea un valor válido del enum Role
    if (!Object.values(Role).includes(requestingUserRoleHeader as Role)) {
      return NextResponse.json({ message: 'No autorizado: Rol del solicitante inválido.' }, { status: 401, headers: withCors(origin) });
    }
    requestingUserRole = requestingUserRoleHeader as Role;
    // --- Fin de Autenticación y Autorización del Solicitante ---


    // 2. Validación básica de campos obligatorios para el nuevo usuario
    if (!email || !name || !password) {
      return NextResponse.json({ message: 'Faltan campos obligatorios (email, name, password)' }, { status: 400, headers: withCors(origin) });
    }

    let newUserRole: Role = Role.USER; 

    if (newUserRoleString) {
      if (!Object.values(Role).includes(newUserRoleString as Role)) {
        return NextResponse.json({ message: 'Rol de usuario a crear inválido.' }, { status: 400, headers: withCors(origin) });
      }
      newUserRole = newUserRoleString as Role;
    }

    let canCreateTargetRole = false;

    if (requestingUserRole === Role.SUPERADMIN) {
      canCreateTargetRole = true;
    } else if (requestingUserRole === Role.ADMIN) {
      const allowedAdminCreationRoles: Role[] = [Role.ADMIN, Role.MODERATOR, Role.USER];
      if (allowedAdminCreationRoles.includes(newUserRole)) {
        canCreateTargetRole = true;
      }
    }
    if (!canCreateTargetRole) {
      return NextResponse.json({ message: 'No tienes permisos para crear usuarios con este rol.' }, { status: 403, headers: withCors(origin) });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: newUserRole,
        status: 'ACTIVE',
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
    return NextResponse.json({ message: 'Error al crear usuario', error: error.message }, { status: 500, headers: withCors(origin) });
  }
}