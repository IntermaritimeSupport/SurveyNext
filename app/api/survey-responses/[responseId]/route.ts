// app/api/survey-responses/[responseId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client'
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

// GET /api/survey-responses/[responseId] - Obtener una respuesta por ID
export async function GET(request: Request, { params }: { params: { responseId: string } }) {
  const origin = request.headers.get('origin')
  const { responseId } = params;
  try {
    const surveyResponse = await prisma.surveyResponse.findUnique({
      where: { id: responseId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        survey: { select: { id: true, title: true, isAnonymous: true } },
        answers: {
          include: {
            question: {
              select: { id: true, title: true, type: true, order: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!surveyResponse) {
      return NextResponse.json({ message: 'Respuesta de encuesta no encontrada' }, { status: 404 });
    }
    return NextResponse.json(surveyResponse, { status: 200 });
  } catch (error) {
    console.error(`Error fetching survey response ${responseId}:`, error);
    return NextResponse.json({ message: 'Error al obtener la respuesta de la encuesta' }, { status: 500 });
  }
}

// PUT /api/survey-responses/[responseId] - Actualizar una respuesta por ID
// Típicamente, las respuestas de una encuesta no se "actualizan" completamente
// una vez enviadas, pero esta ruta podría usarse para marcar como completada
// o añadir/modificar respuestas si la lógica de negocio lo permite.
export async function PUT(request: Request, { params }: { params: { responseId: string } }) {
  const origin = request.headers.get('origin')
  const { responseId } = params;
  try {
    const body = await request.json();
    const { email, isComplete, answers } = body; // 'answers' puede ser un array para actualizar respuestas existentes

    // Puedes obtener la respuesta existente para comparar o validar
    const existingResponse = await prisma.surveyResponse.findUnique({
        where: { id: responseId },
        select: { isComplete: true }
    });

    if (!existingResponse) {
        return NextResponse.json({ message: 'Respuesta de encuesta no encontrada para actualizar' }, { status: 404 });
    }

    const dataToUpdate: any = { email };

    if (isComplete !== undefined && isComplete !== existingResponse.isComplete) {
        dataToUpdate.isComplete = isComplete;
        dataToUpdate.completedAt = isComplete ? new Date() : null; // Establecer fecha de completado
    }

    // Lógica para actualizar las respuestas individuales (Answers)
    // Esto es más complejo: requiere iterar sobre 'answers' y usar upsert o update/create
    if (answers && Array.isArray(answers)) {
        // Ejemplo simplificado: iterar y actualizar/crear
        const updateAnswerPromises = answers.map((answer: any) => {
            return prisma.answer.upsert({
                where: {
                    questionId_responseId: {
                        questionId: answer.questionId,
                        responseId: responseId,
                    },
                },
                update: { value: answer.value },
                create: {
                    questionId: answer.questionId,
                    responseId: responseId,
                    value: answer.value,
                },
            });
        });
        await Promise.all(updateAnswerPromises);
    }

    const updatedSurveyResponse = await prisma.surveyResponse.update({
      where: { id: responseId },
      data: dataToUpdate,
      include: {
        answers: true, // Incluir las respuestas actualizadas
      },
    });

    // Opcional: Actualizar SurveyAnalytics si el estado de completitud cambia
    if (isComplete && !existingResponse.isComplete) {
        // Buscar la encuesta para obtener su ID
        const surveyId = updatedSurveyResponse.surveyId;
        await prisma.surveyAnalytics.upsert({
            where: {
                surveyId_date: {
                    surveyId: surveyId,
                    date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
                },
            },
            update: {
                completions: { increment: 1 },
                // avgCompletionTime si lo calculas aquí
            },
            create: {
                surveyId: surveyId,
                date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
                views: 0, starts: 0, completions: 1,
            },
        });
    }

    return NextResponse.json(updatedSurveyResponse, { status: 200 });
  } catch (error: any) {
    console.error(`Error updating survey response ${responseId}:`, error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Respuesta de encuesta no encontrada para actualizar' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al actualizar la respuesta de la encuesta' }, { status: 500 });
  }
}

// DELETE /api/survey-responses/[responseId] - Eliminar una respuesta por ID
export async function DELETE(request: Request, { params }: { params: { responseId: string } }) {
  const origin = request.headers.get('origin')
  const { responseId } = params;
  try {
    await prisma.surveyResponse.delete({
      where: { id: responseId },
    });
    return NextResponse.json({ message: 'Respuesta de encuesta eliminada correctamente' }, { status: 204 });
  } catch (error: any) {
    console.error(`Error deleting survey response ${responseId}:`, error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Respuesta de encuesta no encontrada para eliminar' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al eliminar la respuesta de la encuesta' }, { status: 500 });
  }
}