// app/api/survey-responses/route.ts
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
const prisma = new PrismaClient()

// GET /api/survey-responses - Obtener todas las respuestas de todas las encuestas
export async function GET(request: Request) {
  try {
    const responses = await prisma.surveyResponse.findMany({
      orderBy: {
        startedAt: 'desc', // O 'completedAt' si solo te interesan las finalizadas
      },
      include: {
        survey: { // Incluye la información de la encuesta a la que pertenece la respuesta
          select: {
            id: true,
            title: true,
            description: true,
            isAnonymous: true,
          },
        },
        user: { // Incluye la información del usuario que respondió (si no es anónimo)
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        answers: { // Incluye las respuestas individuales
          select: {
            id: true,
            value: true,
            question: { // Incluye la pregunta asociada a cada respuesta
              select: {
                id: true,
                title: true,
                type: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(responses, { status: 200 });
  } catch (error) {
    console.error('Error fetching all survey responses:', error);
    return NextResponse.json({ message: 'Error al obtener todas las respuestas' }, { status: 500 });
  }
}