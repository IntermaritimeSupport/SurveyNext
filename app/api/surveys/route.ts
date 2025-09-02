// app/api/surveys/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, SurveyStatus } from '@prisma/client'
const prisma = new PrismaClient()

// GET /api/surveys - Obtener todas las encuestas
export async function GET(request: Request) {
  try {
    const surveys = await prisma.survey.findMany({
      orderBy: {
        createdAt: 'desc', // Ordenar por fecha de creación descendente
      },
      // Puedes incluir relaciones si es necesario, por ejemplo, las preguntas o el usuario
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        questions: {
          select: {
            id: true,
            title: true,
            type: true,
            order: true,
          },
          orderBy: {
            order: 'asc', // Ordenar preguntas por orden
          },
        },
        _count: {
          select: {
            responses: true,
            questions: true,
          },
        },
      },
    });
    return NextResponse.json(surveys, { status: 200 });
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json({ message: 'Error al obtener las encuestas' }, { status: 500 });
  }
}

// POST /api/surveys - Crear una nueva encuesta
export async function POST(request: Request) {
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
      userId, // Necesitas un userId para relacionar la encuesta con un usuario
      questions, // Si quieres crear preguntas junto con la encuesta
      isPublished
    } = body;

    // Validación básica de campos requeridos
    if (!title || !customLink || !userId) {
      return NextResponse.json({ message: 'Faltan campos obligatorios: title, customLink, userId' }, { status: 400 });
    }

    // Puedes añadir validación para customLink (ej. formato URL, unicidad)

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
        status: isPublished ? SurveyStatus.PUBLISHED : SurveyStatus.DRAFT, // ✅ usar el valor del toggle

        ...(questions && questions.length > 0 && {
          questions: {
            create: questions.map((q: any, index: number) => ({
              title: q.title,
              description: q.description,
              type: q.type,
              required: q.required || false,
              order: q.order !== undefined ? q.order : index,
              options: q.options || null,
              validation: q.validation || null,
            })),
          },
        }),
      },
      include: {
        user: { select: { id: true, name: true } },
        questions: { select: { id: true, title: true, type: true, order: true } },
      },
    });


    return NextResponse.json(newSurvey, { status: 201 });
  } catch (error: any) {
    console.error('Error creating survey:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('customLink')) {
      return NextResponse.json({ message: 'El enlace personalizado ya está en uso' }, { status: 409 });
    }
    // Added a more specific error for P2003 (Foreign Key Constraint Violation)
    if (error.code === 'P2003' && error.meta?.field_name?.includes('userId')) {
      return NextResponse.json({ message: 'El ID de usuario proporcionado no existe.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al crear la encuesta' }, { status: 500 });
  }
}
