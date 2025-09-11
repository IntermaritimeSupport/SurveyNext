// app/api/surveys/[surveyId]/questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, QuestionType } from '@prisma/client';
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
interface ResponseDetailPageProps {
  params: Promise<{
    surveyId: string;
  }>;
}
// GET /api/surveys/[surveyId]/questions
export async function GET(request: NextRequest, {params: resolvedParams}: ResponseDetailPageProps) {
  const origin = request.headers.get('origin');
  const { surveyId } = await resolvedParams;
  try {
    const questions = await prisma.question.findMany({
      where: { surveyId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(questions || [], { status: 200, headers: withCors(origin) });
  } catch (error) {
    console.error(`Error fetching questions for survey ${surveyId}:`, error);
    return NextResponse.json({ message: 'Error al obtener las preguntas' }, { status: 500, headers: withCors(origin) });
  }
}

// POST /api/surveys/[surveyId]/questions
export async function POST(request: NextRequest, { params: resolvedParams }: ResponseDetailPageProps) {
  const origin = request.headers.get('origin');
  const { surveyId } = await resolvedParams;

  try {
    const body = await request.json();
    const clientQuestions: any[] = body.questions || [];

    // Validación preliminar de todas las preguntas antes de la transacción
    for (const q of clientQuestions) {
      if (!q.title || !q.type || q.order === undefined || q.order === null) {
        return NextResponse.json(
          { message: `Faltan campos obligatorios en una pregunta: title, type, order. Pregunta: ${JSON.stringify(q)}` },
          { status: 400, headers: withCors(origin) }
        );
      }
      if (!Object.values(QuestionType).includes(q.type)) {
        return NextResponse.json(
          { message: `Tipo de pregunta inválido para la pregunta "${q.title}": ${q.type}` },
          { status: 400, headers: withCors(origin) }
        );
      }
    }

    // Validar que la encuesta exista
    const surveyExists = await prisma.survey.findUnique({ where: { id: surveyId } });
    if (!surveyExists) {
      return NextResponse.json({ message: 'La encuesta especificada no existe' }, { status: 404, headers: withCors(origin) });
    }

    // IDs de preguntas existentes en DB
    const existingDbQuestions = await prisma.question.findMany({
      where: { surveyId },
      select: { id: true },
    });
    const existingDbQuestionIds = new Set(existingDbQuestions.map(q => q.id));
    const clientExistingQuestionIds = new Set(clientQuestions.filter(q => q.id).map(q => q.id));

    // Eliminar preguntas no enviadas por el cliente
    const questionsToDeleteIds = existingDbQuestions
      .filter(dbQ => !clientExistingQuestionIds.has(dbQ.id))
      .map(dbQ => dbQ.id);

    if (questionsToDeleteIds.length > 0) {
      await prisma.question.deleteMany({ where: { id: { in: questionsToDeleteIds } } });
    }

    // Crear o actualizar preguntas
    const transactionOps = clientQuestions.map(q => {
      const data: any = {
        title: q.title,
        description: q.description || null,
        type: q.type,
        required: q.required || false,
        order: q.order,
        options: q.options || null,
        validation: q.validation || null,
        surveyId,
      };

      if (q.id && existingDbQuestionIds.has(q.id)) {
        return prisma.question.update({ where: { id: q.id }, data });
      } else {
        return prisma.question.create({ data });
      }
    });

    await prisma.$transaction(transactionOps);

    const updatedQuestions = await prisma.question.findMany({
      where: { surveyId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(updatedQuestions, { status: 200, headers: withCors(origin) });
  } catch (error) {
    console.error(`Error synchronizing questions for survey ${surveyId}:`, error);
    return NextResponse.json(
      { message: 'Error al sincronizar las preguntas de la encuesta' },
      { status: 500, headers: withCors(origin) }
    );
  }
}
