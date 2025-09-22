// app/api/surveys/[surveyId]/responses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, QuestionType, SurveyStatus } from '@prisma/client'

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

interface QuestionOption {
  value: string;
  label: string;
}

interface AnswerInput {
  questionId: string;
  value: any;
}

interface PostResponseBody {
  email?: string;
  position: string | null
  ships: string | null
  fullName: string | null
  company: string | null
  userId?: string;
  answers: AnswerInput[];
  isComplete?: boolean;
}

const sanitizeOptions = (options: any): QuestionOption[] | null => {
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
      company,
      fullName,
      position,
      ships,
      answers,
      isComplete = false,
    } = body;

    const xForwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = xForwardedFor
      ? xForwardedFor.split(',')[0].trim()
      : request.headers.get('X-Real-IP') || request.headers.get('host') || 'Unknown';
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

    const questionMap = new Map(
      survey.questions.map(q => [q.id, { ...q, options: sanitizeOptions(q.options) }])
    );
    const answersToCreate: AnswerInput[] = [];

    // --- Answer Validation Loop ---
    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue; // Ignore invalid question IDs

      let processedValue: any = answer.value ?? null;
      const questionOptions = question.options as QuestionOption[] | null;
      const questionValidation = question.validation as Record<string, any> | null;

      // Check if the answer is effectively empty
      const isAnswerEmpty =
        processedValue === null ||
        (typeof processedValue === 'string' && processedValue.trim() === '') ||
        (Array.isArray(processedValue) && processedValue.length === 0) ||
        (typeof processedValue === 'object' &&
          processedValue !== null &&
          Object.keys(processedValue).length === 0 &&
          question.type !== QuestionType.FILE_UPLOAD);

      if (question.required && isAnswerEmpty) {
        return NextResponse.json(
          { message: `La pregunta '${question.title}' es requerida y no fue respondida.` },
          { status: 400, headers: withCors(origin) }
        );
      }

      if (!question.required && isAnswerEmpty) {
        answersToCreate.push({ questionId: answer.questionId, value: null });
        continue;
      }

      // Type-specific validation
      switch (question.type) {
        case QuestionType.TEXT:
        case QuestionType.TEXTAREA:
        case QuestionType.URL:
        case QuestionType.PHONE:
        case QuestionType.EMAIL:
          if (typeof processedValue !== 'string') {
            return NextResponse.json(
              { message: `La respuesta para '${question.title}' debe ser texto.` },
              { status: 400, headers: withCors(origin) }
            );
          }

          if (question.type === QuestionType.EMAIL) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(processedValue)) {
              return NextResponse.json(
                { message: `El formato de email para '${question.title}' es inválido.` },
                { status: 400, headers: withCors(origin) }
              );
            }
          }

          if (questionValidation?.maxLength && processedValue.length > questionValidation.maxLength) {
            return NextResponse.json(
              { message: `La respuesta para '${question.title}' excede ${questionValidation.maxLength} caracteres.` },
              { status: 400, headers: withCors(origin) }
            );
          }
          if (questionValidation?.minLength && processedValue.length < questionValidation.minLength) {
            return NextResponse.json(
              { message: `La respuesta para '${question.title}' requiere al menos ${questionValidation.minLength} caracteres.` },
              { status: 400, headers: withCors(origin) }
            );
          }
          if (questionValidation?.pattern && !new RegExp(questionValidation.pattern).test(processedValue)) {
            return NextResponse.json(
              { message: `La respuesta para '${question.title}' no coincide con el patrón requerido.` },
              { status: 400, headers: withCors(origin) }
            );
          }
          break;

        case QuestionType.NUMBER:
          processedValue = Number(processedValue);
          if (isNaN(processedValue)) {
            return NextResponse.json(
              { message: `La respuesta para '${question.title}' debe ser un número válido.` },
              { status: 400, headers: withCors(origin) }
            );
          }
          break;

        case QuestionType.SCALE:
        case QuestionType.RATING:
          processedValue = Number(processedValue);
          if (isNaN(processedValue)) {
            return NextResponse.json(
              { message: `La respuesta para '${question.title}' debe ser un número válido.` },
              { status: 400, headers: withCors(origin) }
            );
          }
          const minVal = questionValidation?.min ?? 1;
          const maxVal = questionValidation?.max ?? 10;
          if (processedValue < minVal || processedValue > maxVal) {
            return NextResponse.json(
              { message: `La respuesta para '${question.title}' debe estar entre ${minVal} y ${maxVal}.` },
              { status: 400, headers: withCors(origin) }
            );
          }
          break;

        case QuestionType.DATE:
          if (!/^\d{4}-\d{2}-\d{2}$/.test(processedValue) || isNaN(new Date(processedValue).getTime())) {
            return NextResponse.json(
              { message: `La respuesta para '${question.title}' debe ser fecha válida YYYY-MM-DD.` },
              { status: 400, headers: withCors(origin) }
            );
          }
          break;

        case QuestionType.TIME:
          if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(processedValue)) {
            return NextResponse.json(
              { message: `La respuesta para '${question.title}' debe ser formato HH:mm.` },
              { status: 400, headers: withCors(origin) }
            );
          }
          break;

        case QuestionType.MULTIPLE_CHOICE:
        case QuestionType.DROPDOWN:
          if (!questionOptions?.some(opt => opt.value === processedValue)) {
            return NextResponse.json(
              { message: `La opción seleccionada para '${question.title}' es inválida.` },
              { status: 400, headers: withCors(origin) }
            );
          }
          break;

        case QuestionType.CHECKBOXES:
          if (!Array.isArray(processedValue) || !questionOptions) {
            return NextResponse.json(
              { message: `La respuesta para '${question.title}' debe ser array de opciones.` },
              { status: 400, headers: withCors(origin) }
            );
          }
          const validValues = questionOptions.map(opt => opt.value);
          if (!processedValue.every((v: any) => validValues.includes(v))) {
            return NextResponse.json(
              { message: `Una o más opciones seleccionadas para '${question.title}' son inválidas.` },
              { status: 400, headers: withCors(origin) }
            );
          }
          break;

        case QuestionType.FILE_UPLOAD:
          if (!processedValue?.fileName || !processedValue?.fileUrl) {
            return NextResponse.json(
              { message: `La respuesta de archivo para '${question.title}' es inválida.` },
              { status: 400, headers: withCors(origin) }
            );
          }
          break;

        case QuestionType.SIGNATURE:
          // Basic check for signature data URI or string presence
          if (typeof processedValue !== 'string' || processedValue.length < 10) {
            return NextResponse.json(
              { message: `La respuesta de firma para '${question.title}' es inválida.` },
              { status: 400, headers: withCors(origin) }
            );
          }
          break;

        case QuestionType.MATRIX:
          if (
            typeof processedValue !== 'object' ||
            processedValue === null ||
            Array.isArray(processedValue) ||
            Object.keys(processedValue).length === 0
          ) {
            return NextResponse.json(
              { message: `La respuesta para '${question.title}' (matriz) es inválida.` },
              { status: 400, headers: withCors(origin) }
            );
          }
          break;

        default:
          console.warn(`Pregunta tipo no manejado: ${question.type}`);
          break;
      }

      answersToCreate.push({ questionId: answer.questionId, value: processedValue });
    }

    // --- Create Response Transaction ---
    const newSurveyResponse = await prisma.$transaction(async tx => {
      // Determine if respondent metadata should be saved
      const isAnonymous = survey.isAnonymous;

      // Validate 'ships' if provided (since it's Int in the model)
      let processedShips = null;
      if (ships !== undefined && ships !== null) {
        processedShips = parseInt(String(ships), 10);
        if (isNaN(processedShips)) {
          throw new Error("El valor de 'ships' debe ser un número entero.");
        }
      }

      const createdResponse = await tx.surveyResponse.create({
        data: {
          surveyId,

          // Respondent Metadata (null if anonymous)
          email: isAnonymous ? null : email,
          userId: isAnonymous ? null : clientUserId,
          company: isAnonymous ? null : company,
          fullName: isAnonymous ? null : fullName,
          position: isAnonymous ? null : position,
          ships: isAnonymous ? null : processedShips,

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
        : error.message.includes('ships')
        ? 400 // Custom validation error for 'ships'
        : 500;

    return NextResponse.json(
      { message: error.message || 'Error interno del servidor.', error: error.message },
      { status, headers: withCors(origin) }
    );
  }
}