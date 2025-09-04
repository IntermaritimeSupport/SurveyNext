// app/api/surveys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, SurveyStatus, QuestionType } from '@prisma/client';

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

// GET /api/surveys - Obtener todas las encuestas
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  try {
    const surveys = await prisma.survey.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        questions: {
          select: { id: true, title: true, type: true, order: true },
          orderBy: { order: 'asc' },
        },
        _count: { select: { responses: true, questions: true } },
      },
    });
    return NextResponse.json(surveys, { status: 200, headers: withCors(origin) });
  } catch (error: any) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json({ message: 'Error al obtener las encuestas', details: error.message }, { status: 500, headers: withCors(origin) });
  }
}

// POST /api/surveys - Crear una nueva encuesta
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  try {
    const body = await request.json();
    const {
      title,
      description,
      customLink,
      isAnonymous,
      showProgress,
      allowMultipleResponses,
      startDate,
      endDate,
      userId,
      questions,
      isPublished,
    } = body;

    // Validación de campos obligatorios
    if (!title || !customLink || !userId) {
      return NextResponse.json({ message: 'Faltan campos obligatorios: title, customLink, userId' }, { status: 400, headers: withCors(origin) });
    }

    // Crear encuesta
    const newSurvey = await prisma.survey.create({
      data: {
        title,
        description,
        customLink,
        isAnonymous: isAnonymous || false,
        showProgress: showProgress ?? true,
        allowMultipleResponses: allowMultipleResponses || false,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        userId,
        status: isPublished ? SurveyStatus.PUBLISHED : SurveyStatus.DRAFT,
        ...(questions && questions.length > 0 && {
          questions: {
            create: questions.map((q: any, index: number) => {
              if (!q.title || !q.type || !Object.values(QuestionType).includes(q.type)) {
                throw new Error(`Pregunta inválida en la creación: ${JSON.stringify(q)}`);
              }
              return {
                title: q.title,
                description: q.description ?? null,
                type: q.type as QuestionType,
                required: q.required || false,
                order: q.order ?? index,
                options: q.options ?? null,
                validation: q.validation ?? null,
              };
            }),
          },
        }),
      },
      include: {
        user: { select: { id: true, name: true } },
        questions: { select: { id: true, title: true, type: true, order: true } },
      },
    });

    return NextResponse.json(newSurvey, { status: 201, headers: withCors(origin) });
  } catch (error: any) {
    console.error('Error creating survey:', error);

    if (error.code === 'P2002' && error.meta?.target?.includes('customLink')) {
      return NextResponse.json({ message: 'El enlace personalizado ya está en uso' }, { status: 409, headers: withCors(origin) });
    }

    if (error.code === 'P2003' && error.meta?.field_name?.includes('userId')) {
      return NextResponse.json({ message: 'El ID de usuario proporcionado no existe.' }, { status: 404, headers: withCors(origin) });
    }

    return NextResponse.json({ message: 'Error al crear la encuesta', details: error.message }, { status: 500, headers: withCors(origin) });
  }
}
