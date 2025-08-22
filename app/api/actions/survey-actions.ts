// actions/survey-actions.ts
'use server';
import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache';
const prisma = new PrismaClient()
import { SurveyStatus, QuestionType } from '@prisma/client';

export async function getAllSurveys() {
  try {
    const surveys = await prisma.survey.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { responses: true } }, // Contar respuestas
      },
    });
    return { success: true, surveys };
  } catch (error) {
    console.error('Error fetching all surveys:', error);
    return { success: false, error: 'Error al obtener las encuestas' };
  }
}

// Obtener una encuesta por ID (para Server Components)
export async function getSurveyById(id: string) {
  try {
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        questions: {
          orderBy: { order: 'asc' },
          include: { answers: true }, // Podrías ajustar qué respuestas incluir
        },
        responses: { // Puedes incluir las respuestas para análisis
          include: { answers: true, user: { select: { id: true, name: true, email: true } } }
        },
        analytics: true,
      },
    });
    if (!survey) {
      return { success: false, error: 'Encuesta no encontrada' };
    }
    return { success: true, survey };
  } catch (error) {
    console.error('Error fetching survey by ID:', error);
    return { success: false, error: 'Error al obtener la encuesta' };
  }
}

// Crear una nueva encuesta
export async function createSurvey(formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string | null;
  const customLink = formData.get('customLink') as string;
  const isAnonymous = formData.get('isAnonymous') === 'on'; // Checkbox
  const showProgress = formData.get('showProgress') === 'on'; // Checkbox
  const allowMultipleResponses = formData.get('allowMultipleResponses') === 'on'; // Checkbox
  const startDate = formData.get('startDate') ? new Date(formData.get('startDate') as string) : null;
  const endDate = formData.get('endDate') ? new Date(formData.get('endDate') as string) : null;
  const userId = formData.get('userId') as string; // Asegúrate de pasar el userId (ej. desde sesión)

  if (!title || !customLink || !userId) {
    return { success: false, error: 'Faltan campos obligatorios: título, enlace personalizado, ID de usuario' };
  }

  try {
    const newSurvey = await prisma.survey.create({
      data: {
        title,
        description,
        customLink,
        isAnonymous,
        showProgress,
        allowMultipleResponses,
        startDate,
        endDate,
        userId,
        // status: SurveyStatus.DRAFT, // Puedes establecer un valor por defecto explícito
      },
      include: { user: { select: { id: true, name: true } } },
    });
    revalidatePath('/dashboard/surveys'); // Revalida la caché de la lista de encuestas
    return { success: true, survey: newSurvey };
  } catch (error: any) {
    console.error('Error creating survey:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('customLink')) {
      return { success: false, error: 'El enlace personalizado ya está en uso' };
    }
    return { success: false, error: 'Error al crear la encuesta' };
  }
}

// Actualizar una encuesta
export async function updateSurvey(id: string, formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string | null;
  const customLink = formData.get('customLink') as string;
  const status = formData.get('status') as SurveyStatus; // Asegúrate de que viene del formulario
  const isAnonymous = formData.get('isAnonymous') === 'on';
  const showProgress = formData.get('showProgress') === 'on';
  const allowMultipleResponses = formData.get('allowMultipleResponses') === 'on';
  const startDate = formData.get('startDate') ? new Date(formData.get('startDate') as string) : null;
  const endDate = formData.get('endDate') ? new Date(formData.get('endDate') as string) : null;

  try {
    const updatedSurvey = await prisma.survey.update({
      where: { id },
      data: {
        title,
        description,
        customLink,
        status,
        isAnonymous,
        showProgress,
        allowMultipleResponses,
        startDate,
        endDate,
      },
      include: { user: { select: { id: true, name: true } } },
    });
    revalidatePath(`/dashboard/surveys/${id}`); // Revalida la página específica de la encuesta
    revalidatePath('/dashboard/surveys'); // Revalida la lista
    return { success: true, survey: updatedSurvey };
  } catch (error: any) {
    console.error('Error updating survey:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('customLink')) {
      return { success: false, error: 'El enlace personalizado ya está en uso' };
    }
    if (error.code === 'P2025') {
      return { success: false, error: 'Encuesta no encontrada para actualizar' };
    }
    return { success: false, error: 'Error al actualizar la encuesta' };
  }
}

// Eliminar una encuesta
export async function deleteSurvey(id: string) {
  try {
    await prisma.survey.delete({ where: { id } });
    revalidatePath('/dashboard/surveys');
    return { success: true, message: 'Encuesta eliminada correctamente' };
  } catch (error: any) {
    console.error('Error deleting survey:', error);
    if (error.code === 'P2025') {
      return { success: false, error: 'Encuesta no encontrada para eliminar' };
    }
    return { success: false, error: 'Error al eliminar la encuesta' };
  }
}