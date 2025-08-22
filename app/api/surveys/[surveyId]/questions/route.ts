// app/api/surveys/[surveyId]/questions/route.ts
import { NextResponse } from 'next/server';
import { QuestionType } from '@prisma/client'; // Importa el enum
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// GET /api/surveys/[surveyId]/questions - Obtener todas las preguntas de una encuesta específica
export async function GET(request: Request, { params }: { params: { surveyId: string } }) {
  const { surveyId } = params;
  try {
    const questions = await prisma.question.findMany({
      where: { surveyId },
      orderBy: { order: 'asc' }, // Asume que quieres las preguntas ordenadas
      include: {
        answers: true, // Puedes decidir si incluir las respuestas aquí o en una ruta separada
      },
    });

    if (!questions) {
      return NextResponse.json({ message: 'Preguntas no encontradas para esta encuesta' }, { status: 404 });
    }
    return NextResponse.json(questions, { status: 200 });
  } catch (error) {
    console.error(`Error fetching questions for survey ${surveyId}:`, error);
    return NextResponse.json({ message: 'Error al obtener las preguntas' }, { status: 500 });
  }
}

// POST /api/surveys/[surveyId]/questions - Crear una nueva pregunta para una encuesta específica
export async function POST(request: Request, { params }: { params: { surveyId: string } }) {
  const { surveyId } = params;
  try {
    const body = await request.json();
    const { title, description, type, required, order, options, validation } = body;

    // Validación básica
    if (!title || !type || order === undefined) {
      return NextResponse.json({ message: 'Faltan campos obligatorios: title, type, order' }, { status: 400 });
    }

    // Asegúrate de que el tipo de pregunta sea válido
    if (!Object.values(QuestionType).includes(type)) {
      return NextResponse.json({ message: `Tipo de pregunta inválido: ${type}` }, { status: 400 });
    }

    // Opcional: Validar que la encuesta exista
    const surveyExists = await prisma.survey.findUnique({ where: { id: surveyId } });
    if (!surveyExists) {
      return NextResponse.json({ message: 'La encuesta especificada no existe' }, { status: 404 });
    }

    const newQuestion = await prisma.question.create({
      data: {
        title,
        description,
        type,
        required: required || false,
        order,
        options: options || null,
        validation: validation || null,
        surveyId,
      },
      include: {
        survey: {
          select: { id: true, title: true },
        },
      },
    });

    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error: any) {
    console.error(`Error creating question for survey ${surveyId}:`, error);
    // Puedes añadir manejo de errores específicos si el orden se considera único por encuesta
    return NextResponse.json({ message: 'Error al crear la pregunta' }, { status: 500 });
  }
}