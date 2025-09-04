// src/app/api/client-info/route.ts
import { NextRequest, NextResponse } from 'next/server';
import cors from '../lib/corsMiddleware';

interface ClientInfo {
  ipAddress: string;
  userAgentFromHeaders: string; // User-Agent obtenido de los headers de la solicitud al servidor
  timestamp: string; // Para medir latencia
}

export async function GET(request: NextRequest, response: NextResponse) {
  await cors(request, response);
  try {
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('host') || 'Desconocida';
    const userAgentFromHeaders = request.headers.get('user-agent') || 'Desconocido';

    const clientInfo: ClientInfo = {
      ipAddress,
      userAgentFromHeaders,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(clientInfo, { status: 200 });
  } catch (error: any) {
    console.error('API /client-info GET: Error fetching client info:', error);
    return NextResponse.json({ message: 'Error al obtener la información del cliente' }, { status: 500 });
  }
}