// app/api/surveys/[surveyId]/questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, QuestionType } from '@prisma/client'
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

// GET /api/surveys/[surveyId]/questions - Obtener todas las preguntas de una encuesta específica
export async function GET(request: Request, { params }: { params: { surveyId: string } }) {
  const origin = request.headers.get('origin')
  const resolvedParams = await params; 
  const { surveyId } = resolvedParams;
  try {
    const questions = await prisma.question.findMany({
      where: { surveyId },
      orderBy: { order: 'asc' },
    });

    if (!questions) {
      return NextResponse.json([], { status: 200 }); 
    }

    // *** YA NO SE NECESITA PARSEAR: Prisma devuelve los campos Json directamente como JS objects/arrays ***
    return NextResponse.json(questions, { status: 200 });
  } catch (error) {
    console.error(`Error fetching questions for survey ${surveyId}:`, error);
    return NextResponse.json({ message: 'Error al obtener las preguntas' }, { status: 500 });
  }
}

// POST /api/surveys/[surveyId]/questions - Sincronizar (crear/actualizar/eliminar) preguntas en lote
export async function POST(request: Request, { params }: { params: { surveyId: string } }) {
  const origin = request.headers.get('origin')
  const resolvedParams = await params;
  const { surveyId } = resolvedParams;
  try {
    const body = await request.json();
    const clientQuestions: any[] = body.questions || []; // Ahora esperamos un ARRAY de preguntas

    // Validar que la encuesta exista
    const surveyExists = await prisma.survey.findUnique({ where: { id: surveyId } });
    if (!surveyExists) {
      return NextResponse.json({ message: 'La encuesta especificada no existe' }, { status: 404 });
    }

    // Obtener IDs de preguntas existentes para esta encuesta
    const existingDbQuestions = await prisma.question.findMany({
      where: { surveyId: surveyId },
      select: { id: true },
    });
    const existingDbQuestionIds = new Set(existingDbQuestions.map(q => q.id));
    
    // IDs de preguntas enviadas por el cliente que ya existen (tienen 'id')
    const clientExistingQuestionIds = new Set(clientQuestions.filter(q => q.id).map(q => q.id));

    // 1. Eliminar preguntas que estaban en la DB pero no fueron enviadas por el cliente
    const questionsToDeleteIds = existingDbQuestions
      .filter(dbQ => !clientExistingQuestionIds.has(dbQ.id))
      .map(dbQ => dbQ.id);

    if (questionsToDeleteIds.length > 0) {
      await prisma.question.deleteMany({
        where: { id: { in: questionsToDeleteIds } },
      });
    }

    // 2. Crear nuevas preguntas y actualizar las existentes
    const transactionOperations = clientQuestions.map(q => {
      // Validación básica para cada pregunta
      if (!q.title || !q.type || q.order === undefined || q.order === null) {
        throw new Error(`Faltan campos obligatorios en una pregunta: title, type, order. Pregunta: ${JSON.stringify(q)}`);
      }
      
      // Asegúrate de que el tipo de pregunta sea válido
      if (!Object.values(QuestionType).includes(q.type)) {
        throw new Error(`Tipo de pregunta inválido para la pregunta "${q.title}": ${q.type}`);
      }

      const questionData: any = { // Usamos 'any' temporalmente para evitar errores de tipo con Prisma Json
        title: q.title,
        description: q.description || null,
        type: q.type,
        required: q.required || false,
        order: q.order,
        options: q.options || null, // *** YA NO SE NECESITA STRINGIFY ***
        validation: q.validation || null, // *** YA NO SE NECESITA STRINGIFY ***
        surveyId: surveyId,
      };

      if (q.id && existingDbQuestionIds.has(q.id)) {
        // Actualizar pregunta existente
        return prisma.question.update({
          where: { id: q.id },
          data: questionData,
        });
      } else {
        // Crear nueva pregunta
        return prisma.question.create({
          data: questionData,
        });
      }
    });

    // Ejecutar todas las operaciones en una transacción
    await prisma.$transaction(transactionOperations);

    // Finalmente, devolver todas las preguntas actualizadas (incluyendo los nuevos IDs)
    const updatedQuestions = await prisma.question.findMany({
      where: { surveyId: surveyId },
      orderBy: { order: 'asc' },
    });

    // *** YA NO SE NECESITA PARSEAR: Prisma devuelve los campos Json directamente ***
    return NextResponse.json(updatedQuestions, { status: 200 });
  } catch (error: any) {
    console.error(`Error synchronizing questions for survey ${surveyId}:`, error);
    if (error.message.includes('Faltan campos obligatorios') || error.message.includes('Tipo de pregunta inválido')) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error al sincronizar las preguntas de la encuesta' }, { status: 500 });
  }
}