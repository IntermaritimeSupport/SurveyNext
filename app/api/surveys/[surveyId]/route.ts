// app/api/surveys/[surveyId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, QuestionType, SurveyStatus } from '@prisma/client';

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

interface Props {
  params: Promise<{
    surveyId: string;
  }>;
}
// GET /api/surveys/[surveyId] - Obtener una encuesta por ID
export async function GET(request: NextRequest, { params: resolvedParams }: Props) {
  const origin = request.headers.get('origin');
  const { surveyId } = await resolvedParams;

  try {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: true },
    });

    if (!survey) {
      return NextResponse.json({ message: 'Encuesta no encontrada' }, { status: 404, headers: withCors(origin) });
    }

    const processedQuestions = survey.questions.map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      validation: typeof q.validation === 'string' ? JSON.parse(q.validation) : q.validation,
    }));

    return NextResponse.json({ ...survey, questions: processedQuestions }, { headers: withCors(origin) });
  } catch (error: any) {
    console.error(`Error fetching survey ${surveyId}:`, error);
    return NextResponse.json({ message: 'Error al obtener la encuesta', details: error.message }, { status: 500, headers: withCors(origin) });
  }
}

// PUT /api/surveys/[surveyId] - Actualizar una encuesta por ID
export async function PUT(request: NextRequest, { params: resolvedParams }: Props) {
  const origin = request.headers.get('origin');
  const { surveyId } = await resolvedParams;

  try {
    const body = await request.json();
    const {
      title, description, customLink, isAnonymous, showProgress,
      allowMultipleResponses, startDate, endDate, isPublished,
      questions: incomingQuestions
    } = body;

    if (!title || !customLink) {
      return NextResponse.json({ message: 'El título y el enlace personalizado son obligatorios.' }, { status: 400, headers: withCors(origin) });
    }

    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;
    const newSurveyStatus = isPublished ? SurveyStatus.PUBLISHED : SurveyStatus.DRAFT;

    const transactionResult = await prisma.$transaction(async tx => {
      const existingDbQuestions = await tx.question.findMany({ where: { surveyId } });
      const existingDbQuestionIds = new Set(existingDbQuestions.map(q => q.id));

      const incomingQuestionIdsToKeep = new Set(
        incomingQuestions
          .filter((q: any) => q.id && typeof q.id === 'string' && !q.id.startsWith('question-'))
          .map((q: any) => q.id)
      );

      const questionsToDeleteIds = [...existingDbQuestionIds].filter(dbId => !incomingQuestionIdsToKeep.has(dbId));
      if (questionsToDeleteIds.length > 0) {
        await tx.question.deleteMany({ where: { id: { in: questionsToDeleteIds }, surveyId } });
      }

      const createOperations: Promise<any>[] = [];
      const updateOperations: Promise<any>[] = [];

      for (const q of incomingQuestions) {
        if (!q.title || !q.type || q.order === undefined || q.order === null) {
          throw new Error(`Faltan campos obligatorios en una pregunta: title, type, order. Pregunta: ${JSON.stringify(q)}`);
        }
        if (typeof q.type !== 'string' || !Object.values(QuestionType).includes(q.type as QuestionType)) {
          throw new Error(`Tipo de pregunta inválido para la pregunta "${q.title}": ${q.type}`);
        }

        const questionData = {
          title: q.title,
          description: q.description ?? null,
          type: q.type as QuestionType,
          required: q.required ?? false,
          order: q.order,
          options: q.options ?? null,
          validation: q.validation ?? null,
          surveyId,
        };

        if (q.id && typeof q.id === 'string' && !q.id.startsWith('question-') && existingDbQuestionIds.has(q.id)) {
          updateOperations.push(tx.question.update({ where: { id: q.id }, data: questionData }));
        } else {
          createOperations.push(tx.question.create({ data: questionData }));
        }
      }

      await Promise.all([...updateOperations, ...createOperations]);

      const updatedSurvey = await tx.survey.update({
        where: { id: surveyId },
        data: {
          title,
          description,
          customLink,
          status: newSurveyStatus,
          isAnonymous,
          showProgress,
          allowMultipleResponses,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
        },
        include: { questions: { orderBy: { order: 'asc' } }, user: { select: { id: true, name: true, email: true } } },
      });

      return updatedSurvey;
    });

    return NextResponse.json(transactionResult, { status: 200, headers: withCors(origin) });
  } catch (error: any) {
    console.error('ERROR updating survey:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('customLink')) {
      return NextResponse.json({ message: 'El enlace personalizado ya está en uso' }, { status: 409, headers: withCors(origin) });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Encuesta no encontrada para actualizar' }, { status: 404, headers: withCors(origin) });
    }
    if (error.message.includes('Faltan campos obligatorios') || error.message.includes('Tipo de pregunta inválido')) {
      return NextResponse.json({ message: error.message }, { status: 400, headers: withCors(origin) });
    }
    return NextResponse.json({ message: 'Error al actualizar la encuesta', details: error.message }, { status: 500, headers: withCors(origin) });
  }
}

// DELETE /api/surveys/[surveyId] - Eliminar encuesta por ID
export async function DELETE(request: NextRequest, { params: resolvedParams }: Props) {
  const origin = request.headers.get('origin');
  const { surveyId } = await resolvedParams;

  try {
    await prisma.survey.delete({ where: { id: surveyId } });
    return new NextResponse(null, { status: 204, headers: withCors(origin) });
  } catch (error: any) {
    console.error('Error deleting survey:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Encuesta no encontrada para eliminar' }, { status: 404, headers: withCors(origin) });
    }
    return NextResponse.json({ message: 'Error interno del servidor al eliminar la encuesta' }, { status: 500, headers: withCors(origin) });
  }
}
