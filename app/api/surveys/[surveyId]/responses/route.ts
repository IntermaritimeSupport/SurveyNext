// app/api/surveys/[surveyId]/responses/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, QuestionType } from '@prisma/client'
const prisma = new PrismaClient()

// Interfaz para el cuerpo de la solicitud POST
interface AnswerInput {
  questionId: string;
  value: any; // El valor de la respuesta, puede ser string, number, array, object, etc.
}

interface PostResponseBody {
  email?: string;
  userId?: string;
  answers: AnswerInput[];
  isComplete?: boolean;
}

// =========================================================================
// GET /api/surveys/[surveyId]/responses - Obtener todas las respuestas de una encuesta específica
// Útil para administradores o generación de reportes.
// =========================================================================
export async function GET(request: Request, { params }: { params: { surveyId: string } }) {
  // --- SOLUCIÓN: Usar await params para silenciar la advertencia ---
  const { surveyId } = await params;
  // --- FIN SOLUCIÓN ---

  try {
    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId },
      orderBy: { startedAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        survey: {
          select: { id: true, title: true, isAnonymous: true },
        },
        answers: {
          include: {
            question: {
              select: { id: true, title: true, type: true, order: true, options: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!responses || responses.length === 0) {
      return NextResponse.json({ message: 'No se encontraron respuestas para esta encuesta.' }, { status: 404 });
    }

    const processedResponses = responses.map(response => ({
      ...response,
      answers: response.answers.map(answer => ({
        ...answer,
        question: {
          ...answer.question,
          options: typeof answer.question.options === 'string'
            ? JSON.parse(answer.question.options)
            : answer.question.options,
        },
      })),
    }));

    return NextResponse.json(processedResponses, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener las respuestas para la encuesta ${surveyId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener las respuestas de la encuesta.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// =========================================================================
// POST /api/surveys/[surveyId]/responses - Crear una nueva respuesta para una encuesta específica
// Este endpoint es clave para cuando un usuario envía una encuesta
// =========================================================================
export async function POST(request: Request, { params }: { params: { surveyId: string } }) {
  // --- SOLUCIÓN: Usar await params para silenciar la advertencia ---
  const { surveyId } = await params;
  // --- FIN SOLUCIÓN ---

  try {
    const body: PostResponseBody = await request.json();
    const { email, userId, answers, isComplete = false } = body;

    // --- 1. Recopilar IP y User Agent de la solicitud ---
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = xForwardedFor ? xForwardedFor.split(',')[0].trim() : request.headers.get('X-Real-IP') || (request as any).ip || 'Unknown';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // --- 2. Validar que la encuesta exista y esté activa para recibir respuestas ---
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      select: { status: true, allowMultipleResponses: true, isAnonymous: true }
    });

    if (!survey) {
      return NextResponse.json({ message: 'Encuesta no encontrada o no válida.' }, { status: 404 });
    }
    if (survey.status !== 'PUBLISHED') {
      return NextResponse.json({ message: 'Esta encuesta no está activa para recibir respuestas.' }, { status: 403 });
    }

    // --- 3. Validar si el usuario ya ha respondido (si no se permiten múltiples respuestas) ---
    if (!survey.allowMultipleResponses && userId && !survey.isAnonymous) {
      const existingResponse = await prisma.surveyResponse.findFirst({
        where: { surveyId, userId }
      });
      if (existingResponse) {
        return NextResponse.json({ message: 'Ya has enviado una respuesta para esta encuesta. No se permiten múltiples respuestas.' }, { status: 409 });
      }
    }

    // --- 4. Obtener todas las preguntas de la encuesta para la validación de las respuestas ---
    const questions = await prisma.question.findMany({
      where: { surveyId },
      select: { id: true, title: true, type: true, required: true, options: true, validation: true }
    });

    const questionMap = new Map(questions.map(q => [q.id, q]));
    const answersToCreate: AnswerInput[] = [];

    // --- 5. Validar y procesar cada respuesta individualmente ---
    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);

      if (!question) {
        return NextResponse.json({ message: `Pregunta con ID '${answer.questionId}' no encontrada en la encuesta.` }, { status: 400 });
      }

      const parsedOptions = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
      const parsedValidation = typeof question.validation === 'string' ? JSON.parse(question.validation) : question.validation;

      if (question.required) {
        if (answer.value === null || answer.value === undefined ||
            (typeof answer.value === 'string' && answer.value.trim() === '') ||
            (Array.isArray(answer.value) && answer.value.length === 0) ||
            (typeof answer.value === 'object' && answer.value !== null && Object.keys(answer.value).length === 0 && question.type !== QuestionType.FILE_UPLOAD)
           ) {
          return NextResponse.json({ message: `La pregunta '${question.title}' es requerida y no fue respondida.` }, { status: 400 });
        }
      }

      let processedValue = answer.value;

      switch (question.type) {
        case QuestionType.TEXT:
        case QuestionType.TEXTAREA:
        case QuestionType.URL:
        case QuestionType.PHONE:
        case QuestionType.EMAIL:
          if (typeof processedValue !== 'string') {
            return NextResponse.json({ message: `La respuesta para '${question.title}' debe ser texto.` }, { status: 400 });
          }
          if (question.type === QuestionType.EMAIL) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(processedValue)) {
              return NextResponse.json({ message: `El formato de email para '${question.title}' es inválido.` }, { status: 400 });
            }
          }
          if (parsedValidation?.maxLength && processedValue.length > parsedValidation.maxLength) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' excede el límite de ${parsedValidation.maxLength} caracteres.` }, { status: 400 });
          }
          if (parsedValidation?.minLength && processedValue.length < parsedValidation.minLength) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' requiere al menos ${parsedValidation.minLength} caracteres.` }, { status: 400 });
          }
          if (parsedValidation?.pattern && !new RegExp(parsedValidation.pattern).test(processedValue)) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' no coincide con el patrón requerido.` }, { status: 400 });
          }
          break;

        case QuestionType.NUMBER:
          processedValue = Number(processedValue);
          if (typeof processedValue !== 'number' || isNaN(processedValue)) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' debe ser un número válido.` }, { status: 400 });
          }
          if (parsedValidation?.min !== undefined && processedValue < parsedValidation.min) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' debe ser al menos ${parsedValidation.min}.` }, { status: 400 });
          }
          if (parsedValidation?.max !== undefined && processedValue > parsedValidation.max) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' no debe exceder ${parsedValidation.max}.` }, { status: 400 });
          }
          break;

        case QuestionType.DATE:
        case QuestionType.TIME:
          if (typeof processedValue !== 'string' || !Date.parse(processedValue)) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' debe ser un formato de fecha/hora válido.` }, { status: 400 });
          }
          // Puedes añadir validación de rango con parsedValidation?.minDate y parsedValidation?.maxDate
          break;

        case QuestionType.MULTIPLE_CHOICE:
        case QuestionType.DROPDOWN:
          if (!parsedOptions || !Array.isArray(parsedOptions) || !parsedOptions.some((opt: any) => opt.value === processedValue)) {
            return NextResponse.json({ message: `La opción seleccionada para '${question.title}' es inválida.` }, { status: 400 });
          }
          break;

        case QuestionType.CHECKBOXES:
          if (!Array.isArray(processedValue)) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' debe ser un array de opciones.` }, { status: 400 });
          }
          if (!parsedOptions || !Array.isArray(parsedOptions)) {
             return NextResponse.json({ message: `Las opciones de configuración para '${question.title}' son inválidas.` }, { status: 500 });
          }
          const validOptionValues = parsedOptions.map((opt: any) => opt.value);
          if (!processedValue.every((val: any) => validOptionValues.includes(val))) {
            return NextResponse.json({ message: `Una o más opciones seleccionadas para '${question.title}' son inválidas.` }, { status: 400 });
          }
          break;

        case QuestionType.SCALE:
          processedValue = Number(processedValue);
          if (typeof processedValue !== 'number' || isNaN(processedValue)) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' debe ser un número en escala.` }, { status: 400 });
          }
          const scaleMin = parsedValidation?.min || 1;
          const scaleMax = parsedValidation?.max || 10;
          if (processedValue < scaleMin || processedValue > scaleMax) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' debe estar entre ${scaleMin} y ${scaleMax}.` }, { status: 400 });
          }
          break;

        case QuestionType.FILE_UPLOAD:
          if (typeof processedValue !== 'object' || processedValue === null || !processedValue.fileName || !processedValue.fileUrl) {
            // Asumimos que `fileUrl` ya ha sido establecido por el proceso de subida
            return NextResponse.json({ message: `La respuesta de subida de archivo para '${question.title}' es inválida o falta la URL.` }, { status: 400 });
          }
          break;

        case QuestionType.SIGNATURE:
          if (typeof processedValue !== 'string' || processedValue.length < 10) {
            return NextResponse.json({ message: `La respuesta de firma para '${question.title}' es inválida.` }, { status: 400 });
          }
          break;

        case QuestionType.MATRIX:
          if (typeof processedValue !== 'object' || processedValue === null || Array.isArray(processedValue)) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' (matriz) debe ser un objeto.` }, { status: 400 });
          }
          break;

        default:
          break;
      }

      answersToCreate.push({
        questionId: answer.questionId,
        value: processedValue,
      });
    }

    // --- 6. Ejecutar la creación de la respuesta y la actualización de analíticas en una transacción ---
    const newSurveyResponse = await prisma.$transaction(async (tx) => {
      const createdResponse = await tx.surveyResponse.create({
        data: {
          surveyId,
          email: survey.isAnonymous ? null : email,
          userId: survey.isAnonymous ? null : userId,
          ipAddress,
          userAgent,
          isComplete,
          completedAt: isComplete ? new Date() : null,
          answers: {
            create: answersToCreate,
          },
        },
        include: {
          answers: true,
        },
      });

      const today = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
      const incrementStarts = isComplete ? 0 : 1;
      const incrementCompletions = isComplete ? 1 : 0;

      await tx.surveyAnalytics.upsert({
        where: {
          surveyId_date: {
            surveyId: surveyId,
            date: today,
          },
        },
        update: {
          starts: { increment: incrementStarts },
          completions: { increment: incrementCompletions },
        },
        create: {
          surveyId: surveyId,
          date: today,
          starts: incrementStarts,
          completions: incrementCompletions,
          views: 0,
        },
      });

      return createdResponse;
    });

    return NextResponse.json(newSurveyResponse, { status: 201 });
  } catch (error: any) {
    console.error(`Error al crear la respuesta de la encuesta para ${surveyId}:`, error);

    if (error.code === 'P2002' && error.meta?.target?.includes('SurveyResponse_surveyId_userId_key')) {
      return NextResponse.json({ message: 'Ya has enviado una respuesta para esta encuesta. No se permiten múltiples respuestas.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor al enviar la respuesta a la encuesta.', error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}