// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
// GET /api/users - Obtener todos los usuarios
export async function GET(request: Request) {
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
    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Error al obtener usuarios' }, { status: 500 });
  }
}

// POST /api/users - Crear un nuevo usuario
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password, role } = body;

    // Validación básica
    if (!email || !name || !password) {
      return NextResponse.json({ message: 'Faltan campos obligatorios (email, name, password)' }, { status: 400 });
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

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json({ message: 'El correo electrónico ya está registrado' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error al crear usuario' }, { status: 500 });
  }
}