// app/api/public/survey-questions/[customlink]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const allowedOrigins = [
  'http://localhost:3000',
  'https://survey-next-git-main-intermaritime.vercel.app',
  'https://surveys.intermaritime.org',
];

// Función auxiliar para CORS
function withCors(origin: string | null) {
  const isAllowed = origin && allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Preflight request (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, {
    status: 200,
    headers: withCors(origin),
  });
}

// GET /api/public/survey-questions/[customlink] - Obtener preguntas de una encuesta por customLink
export async function GET(
  request: NextRequest,
  // ¡Aquí está el cambio clave! params es ahora una Promise.
  { params }: { params: Promise<{ customlink: string }> }
) {
  const origin = request.headers.get('origin');
  // Esperar a que los parámetros se resuelvan antes de acceder a ellos.
  const resolvedParams = await params;
  const { customlink } = resolvedParams; // Aquí obtenemos el customlink

  try {
    const survey = await prisma.survey.findUnique({
      where: { customLink: customlink }, // Usar customLink en lugar de id
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
        // Asegúrate de que tu modelo Survey en schema.prisma tiene un campo 'customLink'
        // marcado como @unique para poder usarlo en findUnique.
        // Si no es único, tendrías que usar findFirst.
      },
    });

    if (!survey) {
      return NextResponse.json(
        { message: 'Encuesta no encontrada' },
        { status: 404, headers: withCors(origin) }
      );
    }

    // ... el resto de tu lógica de validación de encuesta (status, fechas, etc.)
    // La lógica que ya tienes aquí es correcta una vez que tienes el objeto `survey`.

    // Verificar si la encuesta está activa
    if (survey.status !== 'PUBLISHED') {
      return NextResponse.json(
        { message: 'Esta encuesta no está activa actualmente.' },
        { status: 403, headers: withCors(origin) }
      );
    }

    const now = new Date();
    if (survey.startDate && now < survey.startDate) {
      return NextResponse.json(
        { message: 'La encuesta aún no ha comenzado.' },
        { status: 403, headers: withCors(origin) }
      );
    }
    if (survey.endDate && now > survey.endDate) {
      return NextResponse.json(
        { message: 'La encuesta ha finalizado.' },
        { status: 403, headers: withCors(origin) }
      );
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
    });

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
    );
  } catch (error) {
    console.error(
      `Error fetching survey questions for customLink (${customlink}):`,
      error
    );
    return NextResponse.json(
      {
        message: 'Error interno del servidor al obtener las preguntas de la encuesta',
      },
      { status: 500, headers: withCors(origin) }
    );
  }
}