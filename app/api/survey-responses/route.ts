// app/api/survey-responses/route.ts

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withCors } from '@/lib/cors'

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
