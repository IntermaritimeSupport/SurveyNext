// app/api/questions/[questionId]/route.ts
import { NextResponse } from 'next/server';
import { QuestionType } from '@prisma/client';
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// GET /api/questions/[questionId] - Obtener una pregunta por ID
export async function GET(request: Request, { params }: { params: { questionId: string } }) {
  const { questionId } = params;
  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        survey: {
          select: { id: true, title: true, customLink: true, userId: true }, // Incluye datos de la encuesta padre
        },
        answers: true, // Incluye las respuestas asociadas a esta pregunta
      },
    });

    if (!question) {
      return NextResponse.json({ message: 'Pregunta no encontrada' }, { status: 404 });
    }
    return NextResponse.json(question, { status: 200 });
  } catch (error) {
    console.error(`Error fetching question ${questionId}:`, error);
    return NextResponse.json({ message: 'Error al obtener la pregunta' }, { status: 500 });
  }
}

// PUT /api/questions/[questionId] - Actualizar una pregunta por ID
export async function PUT(request: Request, { params }: { params: { questionId: string } }) {
  const { questionId } = params;
  try {
    const body = await request.json();
    const { title, description, type, required, order, options, validation } = body;

    // Asegúrate de que el tipo de pregunta sea válido si se proporciona
    if (type && !Object.values(QuestionType).includes(type)) {
      return NextResponse.json({ message: `Tipo de pregunta inválido: ${type}` }, { status: 400 });
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        title,
        description,
        type,
        required,
        order,
        options,
        validation,
        // surveyId no debería ser actualizable aquí, ya que la pregunta pertenece a una encuesta específica
      },
      include: {
        survey: {
          select: { id: true, title: true },
        },
      },
    });

    return NextResponse.json(updatedQuestion, { status: 200 });
  } catch (error: any) {
    console.error(`Error updating question ${questionId}:`, error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Pregunta no encontrada para actualizar' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al actualizar la pregunta' }, { status: 500 });
  }
}

// DELETE /api/questions/[questionId] - Eliminar una pregunta por ID
export async function DELETE(request: Request, { params }: { params: { questionId: string } }) {
  const { questionId } = params;
  try {
    await prisma.question.delete({
      where: { id: questionId },
    });
    return NextResponse.json({ message: 'Pregunta eliminada correctamente' }, { status: 204 });
  } catch (error: any) {
    console.error(`Error deleting question ${questionId}:`, error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Pregunta no encontrada para eliminar' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al eliminar la pregunta' }, { status: 500 });
  }
}