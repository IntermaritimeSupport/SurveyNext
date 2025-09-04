// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import cors from '../../lib/corsMiddleware';

// POST /api/auth/logout - Endpoint para cerrar sesión
export async function POST(request: NextRequest, response: NextResponse) {
  await cors(request, response);
  try {
    (await cookies()).delete('token');
    return NextResponse.json({ message: 'Sesión cerrada exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}