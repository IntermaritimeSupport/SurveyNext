// app/api/surveys/[surveyId]/responses/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, QuestionType, SurveyStatus } from '@prisma/client'
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
  userId?: string;
  answers: AnswerInput[];
  isComplete?: boolean;
}

const sanitizeOptions = (options: any): QuestionOption[] | null => {
  if (!options || !Array.isArray(options)) {
    return null;
  }
  return options.map((opt: any) => {
    // Si ya es un objeto con value y label, o si es una string simple (caso de datos antiguos)
    if (typeof opt === 'object' && opt !== null && typeof opt.value === 'string' && typeof opt.label === 'string') {
      return { value: opt.value, label: opt.label };
    } 
    // Si por alguna razón se guardó una string simple directamente en el array (formato antiguo)
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    // Si es un formato inesperado, devuelve un objeto vacío o null
    return { value: '', label: '' }; 
  }).filter((opt: QuestionOption) => opt.value !== ''); // Filtra cualquier opción vacía resultante
};

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
// app/api/surveys/[surveyId]/responses/route.ts
// ... (imports y GET route)

export async function POST(request: Request, { params }: { params: { surveyId: string | Promise<string> } }) {
  const resolvedParams = await params;
  const surveyId: string = resolvedParams.surveyId as string;

  try {
    const body: PostResponseBody = await request.json();
    const { email, userId: clientUserId, answers, isComplete = false } = body;

    console.log('API /surveys/[surveyId]/responses POST: Received surveyId:', surveyId);
    console.log('API /surveys/[surveyId]/responses POST: Received body:', JSON.stringify(body, null, 2));

    const xForwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = xForwardedFor ? xForwardedFor.split(',')[0].trim() : request.headers.get('X-Real-IP') || request.headers.get('host') || 'Unknown';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: { select: { id: true, title: true, type: true, required: true, options: true, validation: true } }
      }
    });

    if (!survey) {
      return NextResponse.json({ message: 'Encuesta no encontrada o no válida.' }, { status: 404 });
    }
    if (survey.status !== SurveyStatus.PUBLISHED) {
      return NextResponse.json({ message: 'Esta encuesta no está activa para recibir respuestas.' }, { status: 403 });
    }

    if (!survey.allowMultipleResponses && clientUserId && !survey.isAnonymous) {
      const existingResponse = await prisma.surveyResponse.findFirst({
        where: { surveyId, userId: clientUserId }
      });
      if (existingResponse) {
        return NextResponse.json({ message: 'Ya has enviado una respuesta para esta encuesta. No se permiten múltiples respuestas.' }, { status: 409 });
      }
    }

    const questionMap = new Map(
      survey.questions.map(q => [q.id, {
        ...q,
        options: sanitizeOptions(q.options) // ✅ CORRECCIÓN 1: Sanea las opciones aquí
      }])
    );
    const answersToCreate: AnswerInput[] = [];

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);

      if (!question) {
        return NextResponse.json({ message: `Pregunta con ID '${answer.questionId}' no encontrada en la encuesta.` }, { status: 400 });
      }

      let processedValue: any = answer.value;
      if (processedValue === undefined) {
          processedValue = null;
      }

      // ✅ CORRECCIÓN 2: questionOptions ya viene saneado
      const questionOptions = (question.options as QuestionOption[] | null); 
      const questionValidation = (question.validation as Record<string, any> | null);

      if (question.required) {
        if (processedValue === null || 
            (typeof processedValue === 'string' && processedValue.trim() === '') ||
            (Array.isArray(processedValue) && processedValue.length === 0) ||
            (typeof processedValue === 'object' && processedValue !== null && Object.keys(processedValue).length === 0 && question.type !== QuestionType.FILE_UPLOAD)
           ) {
          return NextResponse.json({ message: `La pregunta '${question.title}' es requerida y no fue respondida.` }, { status: 400 });
        }
      }

      switch (question.type) {
        case QuestionType.TEXT:
        case QuestionType.TEXTAREA:
        case QuestionType.URL:
        case QuestionType.PHONE:
        case QuestionType.EMAIL:
          if (processedValue !== null && typeof processedValue !== 'string') {
            return NextResponse.json({ message: `La respuesta para '${question.title}' debe ser texto. (Tipo recibido: ${typeof processedValue})` }, { status: 400 });
          }
          if (question.type === QuestionType.EMAIL && processedValue !== null) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(processedValue)) {
              return NextResponse.json({ message: `El formato de email para '${question.title}' es inválido.` }, { status: 400 });
            }
          }
          if (questionValidation?.maxLength && processedValue !== null && processedValue.length > questionValidation.maxLength) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' excede el límite de ${questionValidation.maxLength} caracteres.` }, { status: 400 });
          }
          if (questionValidation?.minLength && processedValue !== null && processedValue.length < questionValidation.minLength) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' requiere al menos ${questionValidation.minLength} caracteres.` }, { status: 400 });
          }
          if (questionValidation?.pattern && processedValue !== null && !new RegExp(questionValidation.pattern).test(processedValue)) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' no coincide con el patrón requerido.` }, { status: 400 });
          }
          break;

        case QuestionType.NUMBER:
          if (processedValue !== null) {
              processedValue = Number(processedValue);
              if (typeof processedValue !== 'number' || isNaN(processedValue)) {
                return NextResponse.json({ message: `La respuesta para '${question.title}' debe ser un número válido.` }, { status: 400 });
              }
              if (questionValidation?.min !== undefined && processedValue < questionValidation.min) {
                return NextResponse.json({ message: `La respuesta para '${question.title}' debe ser al menos ${questionValidation.min}.` }, { status: 400 });
              }
              if (questionValidation?.max !== undefined && processedValue > questionValidation.max) {
                return NextResponse.json({ message: `La respuesta para '${question.title}' no debe exceder ${questionValidation.max}.` }, { status: 400 });
              }
          }
          break;

        case QuestionType.DATE:
        case QuestionType.TIME:
          if (processedValue !== null && (typeof processedValue !== 'string' || !Date.parse(processedValue))) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' debe ser un formato de fecha/hora válido.` }, { status: 400 });
          }
          break;

        case QuestionType.MULTIPLE_CHOICE:
        case QuestionType.DROPDOWN:
          if (processedValue !== null && (!questionOptions || !Array.isArray(questionOptions) || !questionOptions.some(opt => opt.value === processedValue))) { // ✅ Validar contra opt.value
            console.log(`DEBUG (Validation Failure): processedValue='${processedValue}' not found in questionOptions (values):`, questionOptions?.map(o => o.value));
            return NextResponse.json({ message: `La opción seleccionada para '${question.title}' es inválida.` }, { status: 400 });
          }
          break;

        case QuestionType.CHECKBOXES:
          if (processedValue !== null && !Array.isArray(processedValue)) {
            return NextResponse.json({ message: `La respuesta para '${question.title}' debe ser un array de opciones.` }, { status: 400 });
          }
          if (processedValue !== null && (!questionOptions || !Array.isArray(questionOptions))) {
             return NextResponse.json({ message: `Las opciones de configuración para '${question.title}' son inválidas.` }, { status: 500 });
          }
          const validCheckboxValues = questionOptions!.map(opt => opt.value); // Extraer los valores válidos
          if (processedValue !== null && !processedValue.every((val: any) => validCheckboxValues.includes(val))) {
            console.log(`DEBUG (Validation Failure): processedValue values [${processedValue}] not all found in validOptionValues:`, validCheckboxValues);
            return NextResponse.json({ message: `Una o más opciones seleccionadas para '${question.title}' son inválidas.` }, { status: 400 });
          }
          break;

        case QuestionType.SCALE:
        case QuestionType.RATING:
          if (processedValue !== null) {
            processedValue = Number(processedValue);
            if (typeof processedValue !== 'number' || isNaN(processedValue)) {
              return NextResponse.json({ message: `La respuesta para '${question.title}' debe ser un número válido.` }, { status: 400 });
            }
            const scaleMin = questionValidation?.min || 1;
            const scaleMax = questionValidation?.max || 10;
            if (processedValue < scaleMin || processedValue > scaleMax) {
              return NextResponse.json({ message: `La respuesta para '${question.title}' debe estar entre ${scaleMin} y ${scaleMax}.` }, { status: 400 });
            }
          }
          break;
        
        case QuestionType.FILE_UPLOAD:
            if (question.required && (!processedValue || typeof processedValue !== 'object' || !processedValue.fileName || !processedValue.fileUrl)) {
                return NextResponse.json({ message: `La respuesta de subida de archivo para '${question.title}' es inválida o falta la URL.` }, { status: 400 });
            }
            break;
        case QuestionType.SIGNATURE:
            if (question.required && (typeof processedValue !== 'string' || processedValue.length < 10)) {
                return NextResponse.json({ message: `La respuesta de firma para '${question.title}' es inválida.` }, { status: 400 });
            }
            break;
        case QuestionType.MATRIX:
            if (question.required && (typeof processedValue !== 'object' || processedValue === null || Array.isArray(processedValue) || Object.keys(processedValue).length === 0)) {
                return NextResponse.json({ message: `La respuesta para '${question.title}' (matriz) es inválida.` }, { status: 400 });
            }
            break;

        default:
          console.warn(`API /responses POST: Tipo de pregunta no manejado en la validación: ${question.type} para pregunta ID: ${question.id}`);
          break;
      }

      answersToCreate.push({
        questionId: answer.questionId,
        value: processedValue,
      });
    }

    const newSurveyResponse = await prisma.$transaction(async (tx) => {
      const createdResponse = await tx.surveyResponse.create({
        data: {
          surveyId,
          email: survey.isAnonymous ? null : email,
          userId: survey.isAnonymous ? null : clientUserId,
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
    console.error(`API /surveys/[surveyId]/responses POST: Error al crear la respuesta de la encuesta para ${surveyId}:`, error);
    console.error(`API /surveys/[surveyId]/responses POST: Detalle del error: ${error.message}`);
    
    if (error.code === 'P2002' && error.meta?.target?.includes('SurveyResponse_surveyId_userId_key')) {
      return NextResponse.json({ message: 'Ya has enviado una respuesta para esta encuesta. No se permiten múltiples respuestas.' }, { status: 409 });
    }
    if (error.code === 'P2003') {
        return NextResponse.json({ message: 'Error de relación de datos: la pregunta o el usuario especificado no existe.' }, { status: 400 });
    }
    if (error.message.includes('requerida') || error.message.includes('inválida') || error.message.includes('excede el límite') || error.message.includes('Pregunta con ID')) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'Error interno del servidor al enviar la respuesta a la encuesta.', error: error.message }, { status: 500 });
  }
}