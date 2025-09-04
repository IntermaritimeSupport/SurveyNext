// app/api/survey-responses/route.ts
import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
const prisma = new PrismaClient()

const allowedOrigins = [
  'http://localhost:3000',
  'https://survey-next-git-main-intermaritime.vercel.app',
  'https://surveys.intermaritime.org',
]

// Función auxiliar para CORS
function withCors(origin: string | null) {
  const isAllowed = origin && allowedOrigins.includes(origin)
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// Preflight request (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, { status: 200, headers: withCors(origin) })
}

// GET /api/survey-responses - Obtener todas las respuestas
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  try {
    const responses = await prisma.surveyResponse.findMany({
      orderBy: { startedAt: 'desc' },
      include: {
        survey: { select: { id: true, title: true, description: true, isAnonymous: true } },
        user: { select: { id: true, email: true, name: true } },
        answers: {
          select: {
            id: true,
            value: true,
            question: { select: { id: true, title: true, type: true } },
          },
        },
      },
    })

    return NextResponse.json(responses, { status: 200, headers: withCors(origin) })
  } catch (error) {
    console.error('Error fetching all survey responses:', error)
    return NextResponse.json(
      { message: 'Error al obtener todas las respuestas' },
      { status: 500, headers: withCors(origin) }
    )
  }
}
