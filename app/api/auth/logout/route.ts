// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// POST /api/auth/logout - Endpoint para cerrar sesión
export async function POST(request: Request) {
  try {
    (await cookies()).delete('token');
    return NextResponse.json({ message: 'Sesión cerrada exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}