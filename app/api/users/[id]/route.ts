// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Role, UserStatus } from '@prisma/client';
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
interface Props {
  params: Promise<{
    id: string;
  }>;
}
// GET /api/users/[id] - Obtener un usuario por ID
export async function GET(request: Request, { params: resolvedParams }: Props) {
  const origin = request.headers.get('origin')
  const { id } = await resolvedParams;
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
        surveys: {
          select: {
            id: true,
            title: true,
            customLink: true,
          }
        },
        responses: {
          select: {
            id: true,
            survey: {
              select: {
                title: true,
              }
            },
          }
        }
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404, headers: withCors(origin) });
    }
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return NextResponse.json({ message: 'Error al obtener usuario' }, { status: 500, headers: withCors(origin) });
  }
}

// PUT /api/users/[id] - Actualizar un usuario por ID
export async function PUT(request: Request, { params: resolvedParams }: Props) {
  const origin = request.headers.get('origin')
  const { id } = await resolvedParams;

  const body = await request.json();
  const { name, email, password, role: newRoleString, status: newStatusString } = body;
  console.log(body)

  // --- 1. Autenticación y Autorización del Solicitante ---
  const requestingUserRoleHeader = request.headers.get('x-requester-role');
  let requestingUserRole: Role;

  if (!requestingUserRoleHeader) {
    return NextResponse.json({ message: 'No autorizado: Rol del solicitante no proporcionado.' }, { status: 401, headers: withCors(origin) });
  }
  if (!Object.values(Role).includes(requestingUserRoleHeader as Role)) {
    return NextResponse.json({ message: 'No autorizado: Rol del solicitante inválido.' }, { status: 401, headers: withCors(origin) });
  }
  requestingUserRole = requestingUserRoleHeader as Role;

  // Si el usuario no es SUPERADMIN ni ADMIN, no puede hacer PUT
  if (requestingUserRole !== Role.SUPERADMIN && requestingUserRole !== Role.ADMIN) {
    return NextResponse.json({ message: 'No tienes permisos para actualizar usuarios.' }, { status: 403, headers: withCors(origin) });
  }
  // --- Fin de Autenticación y Autorización del Solicitante ---

  try {
    // 2. Obtener el usuario que se va a actualizar y verificar sus permisos
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true, email: true } // Necesitamos el rol actual del usuario objetivo
    });

    if (!targetUser) {
      return NextResponse.json({ message: 'Usuario no encontrado para actualizar' }, { status: 404, headers: withCors(origin) });
    }

    // Un ADMIN no puede actualizar un SUPERADMIN
    if (requestingUserRole === Role.ADMIN && targetUser.role === Role.SUPERADMIN) {
      return NextResponse.json({ message: 'No tienes permisos para actualizar un SuperAdmin.' }, { status: 403, headers: withCors(origin) });
    }

    // 3. Preparar datos para actualizar y validar el nuevo rol/estado
    const dataToUpdate: any = {};

    // Solo actualizar si el campo está presente en el body
    if (name !== undefined) dataToUpdate.name = name;
    if (email !== undefined && email !== targetUser.email) { // Permitir actualizar email si es diferente
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== id) {
        return NextResponse.json({ message: 'El correo electrónico ya está registrado por otro usuario' }, { status: 409, headers: withCors(origin) });
      }
      dataToUpdate.email = email;
    }
    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    // Validar y asignar el nuevo rol si se proporciona
    if (newRoleString !== undefined) {
      if (!Object.values(Role).includes(newRoleString as Role)) {
        return NextResponse.json({ message: 'Rol a asignar inválido.' }, { status: 400, headers: withCors(origin) });
      }
      const newRole: Role = newRoleString as Role;

      // Lógica de permisos para asignar el nuevo rol
      if (requestingUserRole === Role.ADMIN) {
        const allowedAdminCreationRoles: Role[] = [Role.ADMIN, Role.MODERATOR, Role.USER];
        if (!allowedAdminCreationRoles.includes(newRole)) {
          return NextResponse.json({ message: 'Un Admin no puede asignar este rol.' }, { status: 403, headers: withCors(origin) });
        }
      }
      // Un SUPERADMIN puede asignar cualquier rol, no necesita más comprobación aquí

      dataToUpdate.role = newRole;
    }

    // Validar y asignar el nuevo estado si se proporciona
    if (newStatusString !== undefined) {
      if (!Object.values(UserStatus).includes(newStatusString as UserStatus)) {
        return NextResponse.json({ message: 'Estado a asignar inválido.' }, { status: 400, headers: withCors(origin) });
      }
      dataToUpdate.status = newStatusString as UserStatus;
    }


    // 4. Ejecutar la actualización
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
    return NextResponse.json({ message: `Error al actualizar usuario: ${error.message}` }, { status: 500, headers: withCors(origin) });
  }
}
// DELETE /api/users/[id] - Eliminar un usuario por ID
export async function DELETE(request: Request, { params: resolvedParams }: Props) {
  const origin = request.headers.get('origin');
  const { id } = await resolvedParams;
  const requestingUserRoleHeader = request.headers.get('x-requester-role');
  let requestingUserRole: Role;

  if (!requestingUserRoleHeader) {
    return NextResponse.json({ message: 'No autorizado: Rol del solicitante no proporcionado.' }, { status: 401, headers: withCors(origin) });
  }
  if (!Object.values(Role).includes(requestingUserRoleHeader as Role)) {
    return NextResponse.json({ message: 'No autorizado: Rol del solicitante inválido.' }, { status: 401, headers: withCors(origin) });
  }
  requestingUserRole = requestingUserRoleHeader as Role;

  // Si el usuario no es SUPERADMIN ni ADMIN, no puede hacer DELETE
  if (requestingUserRole !== Role.SUPERADMIN && requestingUserRole !== Role.ADMIN) {
    return NextResponse.json({ message: 'No tienes permisos para eliminar usuarios.' }, { status: 403, headers: withCors(origin) });
  }
  // --- Fin de Autenticación y Autorización del Solicitante ---

  try {
    // 2. Obtener el usuario que se va a eliminar y verificar sus permisos
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true } // Solo necesitamos el rol
    });

    if (!targetUser) {
      return NextResponse.json({ message: 'Usuario no encontrado para eliminar' }, { status: 404, headers: withCors(origin) });
    }

    // Un ADMIN no puede eliminar un SUPERADMIN
    if (requestingUserRole === Role.ADMIN && targetUser.role === Role.SUPERADMIN) {
      return NextResponse.json({ message: 'No tienes permisos para eliminar un SuperAdmin.' }, { status: 403, headers: withCors(origin) });
    }

    // 3. Ejecutar la eliminación
    await prisma.user.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Usuario eliminado correctamente' }, { status: 200, headers: withCors(origin) }); // 200 OK o 204 No Content
  } catch (error: any) {
    console.error('Error deleting user:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Usuario no encontrado para eliminar' }, { status: 404, headers: withCors(origin) });
    }
    return NextResponse.json({ message: `Error al eliminar usuario: ${error.message}` }, { status: 500, headers: withCors(origin) });
  }
}