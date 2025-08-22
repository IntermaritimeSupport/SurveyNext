// actions/question-actions.ts
'use server'; // Marcar el archivo como un Server Action
import { revalidatePath } from 'next/cache';
import { QuestionType } from '@prisma/client';
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Obtener todas las preguntas de una encuesta específica (para Server Components)
export async function getQuestionsBySurveyId(surveyId: string) {
  try {
    const questions = await prisma.question.findMany({
      where: { surveyId },
      orderBy: { order: 'asc' },
      include: { answers: true }, // Puedes ajustar qué incluir aquí
    });
    return { success: true, questions };
  } catch (error) {
    console.error(`Error fetching questions for survey ${surveyId}:`, error);
    return { success: false, error: 'Error al obtener las preguntas de la encuesta' };
  }
}

// Obtener una pregunta por ID (para Server Components)
export async function getQuestionById(questionId: string) {
  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { survey: true, answers: true },
    });
    if (!question) {
      return { success: false, error: 'Pregunta no encontrada' };
    }
    return { success: true, question };
  } catch (error) {
    console.error(`Error fetching question ${questionId}:`, error);
    return { success: false, error: 'Error al obtener la pregunta' };
  }
}

// Crear una nueva pregunta
export async function createQuestion(formData: FormData) {
  const surveyId = formData.get('surveyId') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string | null;
  const type = formData.get('type') as QuestionType; // Asegúrate de que el tipo coincida con el enum
  const required = formData.get('required') === 'on';
  const order = parseInt(formData.get('order') as string);
  const options = formData.get('options') ? JSON.parse(formData.get('options') as string) : null;
  const validation = formData.get('validation') ? JSON.parse(formData.get('validation') as string) : null;

  if (!surveyId || !title || !type || isNaN(order)) {
    return { success: false, error: 'Faltan campos obligatorios: encuesta, título, tipo, orden' };
  }
  if (!Object.values(QuestionType).includes(type)) {
    return { success: false, error: `Tipo de pregunta inválido: ${type}` };
  }

  try {
    const newQuestion = await prisma.question.create({
      data: {
        surveyId,
        title,
        description,
        type,
        required,
        order,
        options,
        validation,
      },
      include: { survey: { select: { id: true, title: true } } },
    });
    revalidatePath(`/dashboard/surveys/${surveyId}`); // Revalida la página de la encuesta
    return { success: true, question: newQuestion };
  } catch (error: any) {
    console.error('Error creating question:', error);
    // Podrías añadir lógica para ordenar si hay duplicados de orden
    return { success: false, error: 'Error al crear la pregunta' };
  }
}

// Actualizar una pregunta
export async function updateQuestion(questionId: string, formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string | null;
  const type = formData.get('type') as QuestionType;
  const required = formData.get('required') === 'on';
  const order = parseInt(formData.get('order') as string);
  const options = formData.get('options') ? JSON.parse(formData.get('options') as string) : null;
  const validation = formData.get('validation') ? JSON.parse(formData.get('validation') as string) : null;

  if (isNaN(order)) {
    return { success: false, error: 'El orden debe ser un número válido' };
  }
  if (type && !Object.values(QuestionType).includes(type)) {
    return { success: false, error: `Tipo de pregunta inválido: ${type}` };
  }

  try {
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
      },
      include: { survey: { select: { id: true, title: true } } },
    });
    revalidatePath(`/dashboard/surveys/${updatedQuestion.surveyId}`); // Revalida la página de la encuesta
    return { success: true, question: updatedQuestion };
  } catch (error: any) {
    console.error('Error updating question:', error);
    if (error.code === 'P2025') {
      return { success: false, error: 'Pregunta no encontrada para actualizar' };
    }
    return { success: false, error: 'Error al actualizar la pregunta' };
  }
}

// Eliminar una pregunta
export async function deleteQuestion(questionId: string) {
  let surveyId: string | null = null;
  try {
    // Obtener el surveyId antes de eliminar para revalidar la ruta correcta
    const questionToDelete = await prisma.question.findUnique({
      where: { id: questionId },
      select: { surveyId: true },
    });

    if (questionToDelete) {
      surveyId = questionToDelete.surveyId;
    }

    await prisma.question.delete({
      where: { id: questionId },
    });

    if (surveyId) {
      revalidatePath(`/dashboard/surveys/${surveyId}`); // Revalida la página de la encuesta
    }
    return { success: true, message: 'Pregunta eliminada correctamente' };
  } catch (error: any) {
    console.error('Error deleting question:', error);
    if (error.code === 'P2025') {
      return { success: false, error: 'Pregunta no encontrada para eliminar' };
    }
    return { success: false, error: 'Error al eliminar la pregunta' };
  }
}