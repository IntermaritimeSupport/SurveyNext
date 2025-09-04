// app/api/survey-responses/[responseId]/route.ts
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
  return new NextResponse(null, { status: 200, headers: withCors(origin) })
}

// GET /api/survey-responses/[responseId]
export async function GET(request: NextRequest, { params }: { params: { responseId: string } }) {
  const origin = request.headers.get('origin')
  const { responseId } = params
  try {
    const surveyResponse = await prisma.surveyResponse.findUnique({
      where: { id: responseId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        survey: { select: { id: true, title: true, isAnonymous: true } },
        answers: {
          include: { question: { select: { id: true, title: true, type: true, order: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!surveyResponse) {
      return NextResponse.json(
        { message: 'Respuesta de encuesta no encontrada' },
        { status: 404, headers: withCors(origin) }
      )
    }

    return NextResponse.json(surveyResponse, { status: 200, headers: withCors(origin) })
  } catch (error) {
    console.error(`Error fetching survey response ${responseId}:`, error)
    return NextResponse.json(
      { message: 'Error al obtener la respuesta de la encuesta' },
      { status: 500, headers: withCors(origin) }
    )
  }
}

// PUT /api/survey-responses/[responseId]
export async function PUT(request: NextRequest, { params }: { params: { responseId: string } }) {
  const origin = request.headers.get('origin')
  const { responseId } = params
  try {
    const body = await request.json()
    const { email, isComplete, answers } = body

    const existingResponse = await prisma.surveyResponse.findUnique({
      where: { id: responseId },
      select: { isComplete: true },
    })

    if (!existingResponse) {
      return NextResponse.json(
        { message: 'Respuesta de encuesta no encontrada para actualizar' },
        { status: 404, headers: withCors(origin) }
      )
    }

    const dataToUpdate: any = { email }

    if (isComplete !== undefined && isComplete !== existingResponse.isComplete) {
      dataToUpdate.isComplete = isComplete
      dataToUpdate.completedAt = isComplete ? new Date() : null
    }

    if (answers && Array.isArray(answers)) {
      const updateAnswerPromises = answers.map((answer: any) =>
        prisma.answer.upsert({
          where: { questionId_responseId: { questionId: answer.questionId, responseId } },
          update: { value: answer.value },
          create: { questionId: answer.questionId, responseId, value: answer.value },
        })
      )
      await Promise.all(updateAnswerPromises)
    }

    const updatedSurveyResponse = await prisma.surveyResponse.update({
      where: { id: responseId },
      data: dataToUpdate,
      include: { answers: true },
    })

    if (isComplete && !existingResponse.isComplete) {
      const surveyId = updatedSurveyResponse.surveyId
      await prisma.surveyAnalytics.upsert({
        where: { surveyId_date: { surveyId, date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z' } },
        update: { completions: { increment: 1 } },
        create: { surveyId, date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z', views: 0, starts: 0, completions: 1 },
      })
    }

    return NextResponse.json(updatedSurveyResponse, { status: 200, headers: withCors(origin) })
  } catch (error: any) {
    console.error(`Error updating survey response ${responseId}:`, error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { message: 'Respuesta de encuesta no encontrada para actualizar' },
        { status: 404, headers: withCors(origin) }
      )
    }
    return NextResponse.json(
      { message: 'Error al actualizar la respuesta de la encuesta' },
      { status: 500, headers: withCors(origin) }
    )
  }
}

// DELETE /api/survey-responses/[responseId]
export async function DELETE(request: NextRequest, { params }: { params: { responseId: string } }) {
  const origin = request.headers.get('origin')
  const { responseId } = params
  try {
    await prisma.surveyResponse.delete({ where: { id: responseId } })
    return NextResponse.json(
      { message: 'Respuesta de encuesta eliminada correctamente' },
      { status: 200, headers: withCors(origin) }
    )
  } catch (error: any) {
    console.error(`Error deleting survey response ${responseId}:`, error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { message: 'Respuesta de encuesta no encontrada para eliminar' },
        { status: 404, headers: withCors(origin) }
      )
    }
    return NextResponse.json(
      { message: 'Error al eliminar la respuesta de la encuesta' },
      { status: 500, headers: withCors(origin) }
    )
  }
}
