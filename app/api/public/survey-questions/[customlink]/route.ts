// app/api/surveys/[surveyId]/questions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

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
  return new NextResponse(null, {
    status: 200,
    headers: withCors(origin),
  })
}

// GET /api/surveys/[surveyId]/questions - Obtener preguntas de una encuesta por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const origin = request.headers.get('origin')
  const { surveyId } = params

  try {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        isAnonymous: true,
        showProgress: true,
        allowMultipleResponses: true,
        startDate: true,
        endDate: true,
      },
    })

    if (!survey) {
      return NextResponse.json(
        { message: 'Encuesta no encontrada' },
        { status: 404, headers: withCors(origin) }
      )
    }

    // Verificar si la encuesta está activa
    if (survey.status !== 'PUBLISHED') {
      return NextResponse.json(
        { message: 'Esta encuesta no está activa actualmente.' },
        { status: 403, headers: withCors(origin) }
      )
    }

    const now = new Date()
    if (survey.startDate && now < survey.startDate) {
      return NextResponse.json(
        { message: 'La encuesta aún no ha comenzado.' },
        { status: 403, headers: withCors(origin) }
      )
    }
    if (survey.endDate && now > survey.endDate) {
      return NextResponse.json(
        { message: 'La encuesta ha finalizado.' },
        { status: 403, headers: withCors(origin) }
      )
    }

    // Preguntas de la encuesta
    const questions = await prisma.question.findMany({
      where: { surveyId: survey.id },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        required: true,
        order: true,
        options: true,
        validation: true,
      },
    })

    return NextResponse.json(
      {
        survey: {
          id: survey.id,
          title: survey.title,
          description: survey.description,
          isAnonymous: survey.isAnonymous,
          showProgress: survey.showProgress,
          allowMultipleResponses: survey.allowMultipleResponses,
        },
        questions,
      },
      { status: 200, headers: withCors(origin) }
    )
  } catch (error) {
    console.error(
      `Error fetching survey questions for surveyId (${surveyId}):`,
      error
    )
    return NextResponse.json(
      {
        message:
          'Error interno del servidor al obtener las preguntas de la encuesta',
      },
      { status: 500, headers: withCors(origin) }
    )
  }
}
