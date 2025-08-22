// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// POST /api/auth/login - Endpoint para iniciar sesión
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 1. Validación de entrada
    if (!email || !password) {
      return NextResponse.json({ message: 'Se requiere correo electrónico y contraseña' }, { status: 400 });
    }

    // 2. Buscar al usuario por correo electrónico
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ message: 'Credenciales inválidas' }, { status: 401 });
    }

    // 3. Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Credenciales inválidas' }, { status: 401 });
    }

    // 4. Generar un JSON Web Token (JWT)
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET no está definido en las variables de entorno.');
    }

    // Cargar solo la información necesaria en el token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '1h' } // El token expira en 1 hora
    );

    // 5. Opcional: Actualizar lastLogin en la base de datos
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // 6. Establecer el token como una cookie HTTP-only
    // Esto es más seguro que almacenar el token en el localStorage del cliente
    cookies().set('token', token, {
      httpOnly: true, // No accesible desde JavaScript del navegador
      secure: process.env.NODE_ENV === 'production', // Solo enviar en HTTPS en producción
      maxAge: 60 * 60 * 1, // 1 hora (debe coincidir con la expiración del token)
      path: '/', // Accesible desde cualquier ruta
      sameSite: 'lax', // Protección CSRF
    });

    // 7. Devolver una respuesta exitosa (sin el token si lo envías solo por cookie)
    // Puedes devolver información básica del usuario, excepto la contraseña.
    return NextResponse.json(
      {
        message: 'Inicio de sesión exitoso',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en el proceso de login:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}