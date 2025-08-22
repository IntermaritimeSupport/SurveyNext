// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
// GET /api/users/[id] - Obtener un usuario por ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
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
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return NextResponse.json({ message: 'Error al obtener usuario' }, { status: 500 });
  }
}

// PUT /api/users/[id] - Actualizar un usuario por ID
export async function PUT(request: Request, { params }: { params: { id: string } }) {
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

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json({ message: 'El correo electrónico ya está registrado' }, { status: 409 });
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Usuario no encontrado para actualizar' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al actualizar usuario' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Eliminar un usuario por ID
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    await prisma.user.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Usuario eliminado correctamente' }, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Usuario no encontrado para eliminar' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al eliminar usuario' }, { status: 500 });
  }
}