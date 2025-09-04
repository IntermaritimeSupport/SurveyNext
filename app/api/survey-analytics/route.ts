// app/api/survey-analytics/route.ts
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
  return new NextResponse(null, {
    status: 200,
    headers: withCors(origin),
  })
}

// GET /api/survey-analytics - Obtener análisis agregados por encuesta
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')

  try {
    // Agrupar por surveyId y sumar views, starts, completions
    const aggregatedAnalytics = await prisma.surveyAnalytics.groupBy({
      by: ['surveyId'],
      _sum: {
        views: true,
        starts: true,
        completions: true,
      },
    })

    // Obtener info de las encuestas
    const surveyIds = aggregatedAnalytics.map((a) => a.surveyId)
    const surveys = await prisma.survey.findMany({
      where: { id: { in: surveyIds } },
      select: {
        id: true,
        title: true,
        customLink: true,
        status: true,
        questions: { select: { id: true } },
      },
    })

    // Combinar datos
    const result = aggregatedAnalytics.map((item) => {
      const surveyInfo = surveys.find((s) => s.id === item.surveyId)
      return {
        surveyId: item.surveyId,
        surveyTitle: surveyInfo?.title || 'Encuesta desconocida',
        customLink: surveyInfo?.customLink || '',
        status: surveyInfo?.status,
        totalViews: item._sum.views || 0,
        totalStarts: item._sum.starts || 0,
        totalCompletions: item._sum.completions || 0,
        totalQuestions: surveyInfo?.questions.length || 0,
        completionRate:
          item._sum.starts && item._sum.completions
            ? ((item._sum.completions / item._sum.starts) * 100).toFixed(2)
            : 0,
      }
    })

    return NextResponse.json(result, {
      status: 200,
      headers: withCors(origin),
    })
  } catch (error) {
    console.error('Error fetching aggregated analytics:', error)
    return NextResponse.json(
      { message: 'Error al obtener los análisis agregados' },
      { status: 500, headers: withCors(origin) }
    )
  }
}
