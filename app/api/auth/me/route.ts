// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // Para acceder a las cookies
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client'
import cors from '../../lib/corsMiddleware';
const prisma = new PrismaClient()

// Define la interfaz para el payload del JWT
interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// GET /api/auth/me - Obtener información del usuario autenticado
export async function GET(request: NextRequest, response: NextResponse) {
  await cors(request, response);
  try {
    const token = (await cookies()).get('token')?.value; // Intenta obtener el token de la cookie

    if (!token) {
      // Si no hay token en las cookies, el usuario no está autenticado
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET no está definido en las variables de entorno.');
    }

    let decodedToken: JwtPayload;
    try {
      // Verificar y decodificar el token
      decodedToken = jwt.verify(token, jwtSecret) as JwtPayload;
    } catch (jwtError) {
      // Si el token es inválido o ha expirado
      console.error('Error al verificar el token JWT:', jwtError);
      return NextResponse.json({ message: 'Token inválido o expirado' }, { status: 401 });
    }

    // Buscar el usuario en la base de datos para asegurar que aún existe y está activo
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true, // Puedes verificar el estado si tienes un campo 'status'
      },
    });

    if (!user || user.status !== 'ACTIVE') { // O cualquier lógica de estado que uses
      // Si el usuario no existe o no está activo, el token no es válido para una sesión
      return NextResponse.json({ message: 'Usuario no encontrado o inactivo' }, { status: 401 });
    }

    // Si todo es válido, devuelve la información del usuario
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error en /api/auth/me:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}