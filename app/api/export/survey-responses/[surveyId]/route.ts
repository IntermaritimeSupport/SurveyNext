// app/api/export/survey-responses/[surveyId]/route.ts
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
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

// Helper para convertir JSON a CSV
function convertToCsv(data: any[]): string {
  if (data.length === 0) return ''

  const headers: Set<string> = new Set()
  data.forEach(row => {
    Object.keys(row).forEach(key => {
      if (key !== 'answers' && typeof row[key] !== 'object') {
        headers.add(key)
      }
    })
    row.answers.forEach((answer: any) => {
      if (answer.question?.title) {
        headers.add(answer.question.title)
      }
    })
  })

  const headerArray = Array.from(headers)
  let csv = headerArray.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n'

  data.forEach(row => {
    const rowData = headerArray.map(header => {
      if (
        header === 'id' ||
        header === 'ipAddress' ||
        header === 'userAgent' ||
        header === 'email' ||
        header === 'startedAt' ||
        header === 'completedAt' ||
        header === 'isComplete' ||
        header === 'surveyId'
      ) {
        let val = row[header]
        if (val instanceof Date) {
          val = val.toISOString()
        }
        return `"${String(val || '').replace(/"/g, '""')}"`
      } else {
        const answer = row.answers.find((a: any) => a.question?.title === header)
        let val = answer ? answer.value : ''

        if (Array.isArray(val)) {
          val = val.join('; ')
        } else if (typeof val === 'object' && val !== null) {
          val = JSON.stringify(val)
        } else {
          val = String(val || '')
        }
        return `"${val.replace(/"/g, '""')}"`
      }
    })
    csv += rowData.join(',') + '\n'
  })

  return csv
}

// GET /api/export/survey-responses/[surveyId]
export async function GET(
  request: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const origin = request.headers.get('origin')
  const { surveyId } = params

  try {
    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId },
      include: {
        user: { select: { email: true, name: true } },
        answers: {
          include: {
            question: { select: { id: true, title: true, type: true } },
          },
        },
      },
      orderBy: { startedAt: 'asc' },
    })

    if (responses.length === 0) {
      return NextResponse.json(
        { message: 'No hay respuestas para exportar para esta encuesta.' },
        { status: 404, headers: withCors(origin) }
      )
    }

    const csvData = convertToCsv(responses)

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        ...withCors(origin),
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="survey_responses_${surveyId}.csv"`,
      },
    })
  } catch (error) {
    console.error(`Error exporting survey responses for ${surveyId}:`, error)
    return NextResponse.json(
      { message: 'Error al exportar las respuestas.' },
      { status: 500, headers: withCors(origin) }
    )
  }
}
