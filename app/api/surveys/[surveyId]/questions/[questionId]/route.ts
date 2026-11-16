// app/api/surveys/[surveyId]/questions/[questionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { QuestionType } from '@prisma/client'
import prisma from '@/lib/prisma'
import { withCors } from '@/lib/cors'

// Preflight request (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: withCors(origin) });
}

interface ResponseDetailPageProps {
  params: Promise<{
    surveyId: string;
    questionId: string;
  }>;
}

// PUT /api/surveys/[surveyId]/questions/[questionId]
export async function PUT(
  request: NextRequest,
  { params: resolvedParams }: ResponseDetailPageProps
) {
  const origin = request.headers.get('origin');
  const { surveyId, questionId } = await resolvedParams;

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
