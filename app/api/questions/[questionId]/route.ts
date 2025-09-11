// app/api/questions/[questionId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { QuestionType, PrismaClient } from '@prisma/client'

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

interface RouteContext {
  params: Promise<{
    questionId: string;
  }>;
}
// GET /api/questions/[questionId] - Obtener una pregunta por ID
export async function GET(
  request: NextRequest,
  { params: resolvedParams }: RouteContext
) {
  const origin = request.headers.get('origin')
  const { questionId } = await resolvedParams;

  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        survey: {
          select: { id: true, title: true, customLink: true, userId: true },
        },
        answers: true,
      },
    })

    if (!question) {
      return NextResponse.json(
        { message: 'Pregunta no encontrada' },
        { status: 404, headers: withCors(origin) }
      )
    }

    return NextResponse.json(question, {
      status: 200,
      headers: withCors(origin),
    })
  } catch (error) {
    console.error(`Error fetching question ${questionId}:`, error)
    return NextResponse.json(
      { message: 'Error al obtener la pregunta' },
      { status: 500, headers: withCors(origin) }
    )
  }
}

// PUT /api/questions/[questionId] - Actualizar una pregunta por ID
export async function PUT(
  request: NextRequest,
  { params: resolvedParams }: RouteContext
) {
  const origin = request.headers.get('origin')
  const { questionId } = await resolvedParams;

  try {
    const body = await request.json()
    const { title, description, type, required, order, options, validation } =
      body

    // Validar tipo de pregunta
    if (type && !Object.values(QuestionType).includes(type)) {
      return NextResponse.json(
        { message: `Tipo de pregunta inválido: ${type}` },
        { status: 400, headers: withCors(origin) }
      )
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        title,
        description,
        type,
        required,
        order,
        options,
        validation,
      },
      include: {
        survey: { select: { id: true, title: true } },
      },
    })

    return NextResponse.json(updatedQuestion, {
      status: 200,
      headers: withCors(origin),
    })
  } catch (error: any) {
    console.error(`Error updating question ${questionId}:`, error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { message: 'Pregunta no encontrada para actualizar' },
        { status: 404, headers: withCors(origin) }
      )
    }
    return NextResponse.json(
      { message: 'Error al actualizar la pregunta' },
      { status: 500, headers: withCors(origin) }
    )
  }
}

// DELETE /api/questions/[questionId] - Eliminar una pregunta por ID
export async function DELETE(
  request: NextRequest,
  { params: resolvedParams }: RouteContext
) {
  const origin = request.headers.get('origin')
  const { questionId } = await resolvedParams;

  try {
    await prisma.question.delete({
      where: { id: questionId },
    })

    return NextResponse.json(
      { message: 'Pregunta eliminada correctamente' },
      { status: 200, headers: withCors(origin) } // 👈 status 200 en vez de 204 para poder enviar JSON
    )
  } catch (error: any) {
    console.error(`Error deleting question ${questionId}:`, error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { message: 'Pregunta no encontrada para eliminar' },
        { status: 404, headers: withCors(origin) }
      )
    }
    return NextResponse.json(
      { message: 'Error al eliminar la pregunta' },
      { status: 500, headers: withCors(origin) }
    )
  }
}
