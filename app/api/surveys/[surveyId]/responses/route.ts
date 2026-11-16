// app/api/surveys/[surveyId]/responses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Prisma, SurveyStatus } from '@prisma/client'
import { validateAnswer } from '@/lib/forms/validate'
import { visibleQuestionIds } from '@/lib/forms/logic'
import { isAnswerable, type QuestionLike } from '@/lib/forms/question-types'
import prisma from '@/lib/prisma'
import { withCors } from '@/lib/cors'

// Preflight request (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, {
    status: 200,
    headers: withCors(origin),
  });
}

interface QuestionOption {
  value: string;
  label: string;
}

interface AnswerInput {
  questionId: string;
  value: any;
}

interface PostResponseBody {
  email?: string | null;
  userId?: string;
  answers: AnswerInput[];
  isComplete?: boolean;
}

const sanitizeOptions = (options: any): any => {
  if (options && typeof options === 'object' && !Array.isArray(options)) return options; // MATRIX grid
  if (!options || !Array.isArray(options)) return null;
  return options.map((opt: any) => {
    if (typeof opt === 'object' && opt !== null && typeof opt.value === 'string' && typeof opt.label === 'string') {
      return { value: opt.value, label: opt.label };
    } 
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return { value: '', label: '' }; 
  }).filter(opt => opt.value !== '');
};

interface Props {
  params: Promise<{
    surveyId: string;
  }>;
}
// GET /api/surveys/[surveyId]/responses
export async function GET(request: NextRequest, { params: resolvedParams }: Props) {
  const origin = request.headers.get('origin');
  const { surveyId } = await resolvedParams;

  try {
    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId },
      orderBy: { startedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
        survey: { select: { id: true, title: true, isAnonymous: true } },
        answers: {
          include: { question: { select: { id: true, title: true, type: true, order: true, options: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!responses || responses.length === 0) {
      return NextResponse.json({ message: 'No se encontraron respuestas para esta encuesta.' }, { status: 404, headers: withCors(origin) });
    }

    const processedResponses = responses.map(response => ({
      ...response,
      answers: response.answers.map(answer => ({
        ...answer,
        question: {
          ...answer.question,
          options: sanitizeOptions(answer.question.options),
        },
      })),
    }));

    return NextResponse.json(processedResponses, { status: 200, headers: withCors(origin) });
  } catch (error: any) {
    console.error(`API /surveys/[surveyId]/responses GET error for ${surveyId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener las respuestas de la encuesta.', error: error.message }, { status: 500, headers: withCors(origin) });
  }
}

// POST /api/surveys/[surveyId]/responses

export async function POST(request: NextRequest, { params: resolvedParams }: Props) {
  const origin = request.headers.get('origin');
  const { surveyId } = await resolvedParams;

  try {
    const body: PostResponseBody = await request.json();

    const {
      email,
      userId: clientUserId,
      answers,
      isComplete = false,
    } = body;

    const xForwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = xForwardedFor
      ? xForwardedFor.split(',')[0].trim()
      : request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: {
          select: {
            id: true,
            title: true,
            type: true,
            required: true,
            options: true,
            validation: true,
            order: true,
            logic: true,
          },
        },
      },
    });

    if (!survey) {
      return NextResponse.json(
        { message: 'Encuesta no encontrada o no válida.' },
        { status: 404, headers: withCors(origin) }
      );
    }

    if (survey.status !== SurveyStatus.PUBLISHED) {
      return NextResponse.json(
        { message: 'Esta encuesta no está activa para recibir respuestas.' },
        { status: 403, headers: withCors(origin) }
      );
    }

    const now = new Date();
    if ((survey.startDate && now < survey.startDate) || (survey.endDate && now > survey.endDate)) {
      return NextResponse.json(
        { message: 'Esta encuesta no está disponible en este momento.' },
        { status: 403, headers: withCors(origin) }
      );
    }

    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { message: 'Formato de respuestas inválido.' },
        { status: 400, headers: withCors(origin) }
      );
    }

    // Check for duplicate responses if not allowed
    if (!survey.allowMultipleResponses && clientUserId && !survey.isAnonymous) {
      const existingResponse = await prisma.surveyResponse.findFirst({
        where: { surveyId, userId: clientUserId },
      });

      if (existingResponse) {
        return NextResponse.json(
          { message: 'Ya has enviado una respuesta para esta encuesta. No se permiten múltiples respuestas.' },
          { status: 409, headers: withCors(origin) }
        );
      }
    }

    // --- Answer validation: same rules as the public form (lib/forms/validate.ts) ---
    const submitted = new Map(answers.map(a => [a.questionId, a.value]));
    const answersToCreate: { questionId: string; value: any }[] = [];
    // Questions hidden by conditional logic are neither required nor stored
    const visible = visibleQuestionIds(survey.questions, submitted);

    for (const question of survey.questions) {
      if (!isAnswerable(question.type) || !visible.has(question.id)) continue;
      const wasSubmitted = submitted.has(question.id);
      // Partial saves only validate what was sent; a complete submission must cover every question
      if (!wasSubmitted && !isComplete) continue;

      const result = validateAnswer(question as QuestionLike, submitted.get(question.id));
      if (!result.ok) {
        return NextResponse.json(
          { message: `'${question.title}': ${result.error}`, questionId: question.id },
          { status: 400, headers: withCors(origin) }
        );
      }
      if (wasSubmitted) {
        answersToCreate.push({ questionId: question.id, value: result.value ?? Prisma.JsonNull });
      }
    }

    // --- Create Response Transaction ---
    const newSurveyResponse = await prisma.$transaction(async tx => {
      // Anonymous forms never link the response to a user account
      const isAnonymous = survey.isAnonymous;

      const createdResponse = await tx.surveyResponse.create({
        data: {
          surveyId,

          // Respondent Metadata (null if anonymous)
          email: survey.collectEmail && email ? String(email).trim() : null,
          userId: isAnonymous ? null : clientUserId,

          // Request Metadata
          ipAddress,
          userAgent,

          // Status
          isComplete,
          completedAt: isComplete ? new Date() : null,

          // Relations
          answers: { create: answersToCreate },
        },
        include: { answers: true },
      });

      // --- Update Analytics ---
      const today = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';

      // If submitting as incomplete (saving draft), it counts as a "start".
      // If submitting as complete, it counts as a "completion".
      const incrementStarts = isComplete ? 0 : 1;
      const incrementCompletions = isComplete ? 1 : 0;

      await tx.surveyAnalytics.upsert({
        where: { surveyId_date: { surveyId, date: today } },
        update: {
          starts: { increment: incrementStarts },
          completions: { increment: incrementCompletions },
        },
        create: {
          surveyId,
          date: today,
          starts: incrementStarts,
          completions: incrementCompletions,
          views: 0, // Views are handled separately
        },
      });

      return createdResponse;
    });

    return NextResponse.json(newSurveyResponse, { status: 201, headers: withCors(origin) });

  } catch (error: any) {
    console.error(`API /responses POST error for ${surveyId}:`, error);

    // Handle specific Prisma errors
    const status =
      error.code === 'P2002'
        ? 409 // Unique constraint failed
        : error.code === 'P2003'
        ? 400 // Foreign key constraint failed
        : 500;

    return NextResponse.json(
      { message: error.message || 'Error interno del servidor.', error: error.message },
      { status, headers: withCors(origin) }
    );
  }
}