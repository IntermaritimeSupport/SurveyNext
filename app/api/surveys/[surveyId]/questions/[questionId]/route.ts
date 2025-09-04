// app/api/surveys/[surveyId]/questions/[questionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { QuestionType, PrismaClient } from '@prisma/client';
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
  return new NextResponse(null, { status: 200, headers: withCors(origin) });
}

// PUT /api/surveys/[surveyId]/questions/[questionId]
export async function PUT(
  request: NextRequest,
  { params }: { params: { surveyId: string; questionId: string } }
) {
  const origin = request.headers.get('origin');
  const { surveyId, questionId } = params;

  try {
    const body = await request.json();
    const { title, description, type, required, order, options, validation } = body;

    // Validación básica
    if (!title || !type || order === undefined) {
      return NextResponse.json(
        { message: 'Faltan campos obligatorios: title, type, order' },
        { status: 400, headers: withCors(origin) }
      );
    }

    if (!Object.values(QuestionType).includes(type)) {
      return NextResponse.json(
        { message: `Tipo de pregunta inválido: ${type}` },
        { status: 400, headers: withCors(origin) }
      );
    }

    // Validar que la pregunta pertenece a la encuesta
    const questionExists = await prisma.question.findFirst({
      where: { id: questionId, surveyId },
    });
    if (!questionExists) {
      return NextResponse.json(
        { message: 'Pregunta no encontrada en la encuesta especificada.' },
        { status: 404, headers: withCors(origin) }
      );
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        title,
        description,
        type,
        required: required || false,
        order,
        options: options || null,
        validation: validation || null,
      },
      include: {
        survey: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(updatedQuestion, { status: 200, headers: withCors(origin) });
  } catch (error: any) {
    console.error(`Error updating question ${questionId} for survey ${surveyId}:`, error);

    if (error.code === 'P2002' && error.meta?.target?.includes('questions_order_surveyId_key')) {
      return NextResponse.json(
        { message: 'Ya existe una pregunta con este orden en esta encuesta.' },
        { status: 409, headers: withCors(origin) }
      );
    }

    return NextResponse.json(
      { message: 'Error al actualizar la pregunta', details: error.message },
      { status: 500, headers: withCors(origin) }
    );
  }
}
