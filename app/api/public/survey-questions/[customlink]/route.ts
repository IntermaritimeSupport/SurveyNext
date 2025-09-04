// app/api/surveys/[surveyId]/questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
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


// GET /api/public/survey-questions/[customLink] - Obtener las preguntas de una encuesta por su enlace personalizado
export async function GET(request: NextRequest, { params }: { params: { customlink: string } }) {
  const origin = request.headers.get('origin')
  const { customlink } = params;
    console.log(params)
  try {

    const survey = await prisma.survey.findUniqueOrThrow({
      where: { customLink: customlink }, // 👈 asegúrate de usar la prop
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
    });

    if (!survey) {
      return NextResponse.json({ message: 'Encuesta no encontrada' }, { status: 404 });
    }

    // 2. Verificar el estado de la encuesta (solo si está publicada y dentro de las fechas)
    if (survey.status !== 'PUBLISHED') {
      return NextResponse.json({ message: 'Esta encuesta no está activa actualmente.' }, { status: 403 });
    }

    const now = new Date();
    if (survey.startDate && now < survey.startDate) {
      return NextResponse.json({ message: 'La encuesta aún no ha comenzado.' }, { status: 403 });
    }
    if (survey.endDate && now > survey.endDate) {
      return NextResponse.json({ message: 'La encuesta ha finalizado.' }, { status: 403 });
    }

    // 3. Obtener las preguntas relacionadas con esta encuesta
    const questions = await prisma.question.findMany({
      where: { surveyId: survey.id }, // Usar el ID de la encuesta encontrada
      orderBy: { order: 'asc' },
      select: { // Seleccionar solo los campos necesarios para el cliente que va a responder
        id: true,
        title: true,
        description: true,
        type: true,
        required: true,
        order: true,
        options: true,    // Para preguntas con opciones
        validation: true, // Para reglas de validación
      },
    });

    // 4. Devolver la información de la encuesta y sus preguntas
    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        isAnonymous: survey.isAnonymous,
        showProgress: survey.showProgress,
        allowMultipleResponses: survey.allowMultipleResponses,
      },
      questions: questions,
    }, { status: 200 });

  } catch (error) {
    console.error(`Error fetching survey questions by customLink (${customlink}):`, error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener las preguntas de la encuesta' }, { status: 500 });
  }
}
