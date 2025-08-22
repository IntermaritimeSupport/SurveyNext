// actions/survey-response-actions.ts
'use server'; // Marcar el archivo como un Server Action
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers'; // Para obtener encabezados de la solicitud
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Obtener todas las respuestas para una encuesta (para administradores, etc.)
export async function getSurveyResponsesBySurveyId(surveyId: string) {
  try {
    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId },
      orderBy: { startedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
        answers: {
          include: { question: { select: { id: true, title: true, type: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return { success: true, responses };
  } catch (error) {
    console.error(`Error fetching responses for survey ${surveyId}:`, error);
    return { success: false, error: 'Error al obtener las respuestas de la encuesta' };
  }
}

// Obtener una respuesta específica por su ID
export async function getSurveyResponseById(responseId: string) {
  try {
    const response = await prisma.surveyResponse.findUnique({
      where: { id: responseId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        survey: { select: { id: true, title: true, isAnonymous: true } },
        answers: {
          include: { question: { select: { id: true, title: true, type: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!response) {
      return { success: false, error: 'Respuesta de encuesta no encontrada' };
    }
    return { success: true, response };
  } catch (error) {
    console.error(`Error fetching survey response ${responseId}:`, error);
    return { success: false, error: 'Error al obtener la respuesta de la encuesta' };
  }
}

// Crear una nueva respuesta a una encuesta
// Esta acción se usaría típicamente cuando un usuario envía un formulario de encuesta.
export async function submitSurveyResponse(formData: FormData) {
  const surveyId = formData.get('surveyId') as string;
  const email = formData.get('email') as string | null;
  const userId = formData.get('userId') as string | null; // El ID del usuario logueado
  const isComplete = formData.get('isComplete') === 'true'; // Se envía si la encuesta se completó
  const rawAnswers = formData.get('answers') as string; // Espera un JSON string de respuestas

  let answers: { questionId: string; value: any }[];
  try {
    answers = JSON.parse(rawAnswers);
    if (!Array.isArray(answers)) throw new Error('Answers must be an array.');
  } catch (e) {
    return { success: false, error: 'Formato de respuestas inválido.' };
  }

  if (!surveyId) {
    return { success: false, error: 'ID de encuesta es obligatorio.' };
  }

  const requestHeaders = headers();
  const ipAddress = (await requestHeaders).get('x-forwarded-for') || (await requestHeaders).get('remote-addr') || null;
  const userAgent = (await requestHeaders).get('user-agent') || null;

  try {
    const survey = await prisma.survey.findUnique({
        where: { id: surveyId },
        select: { status: true, allowMultipleResponses: true, isAnonymous: true }
    });

    if (!survey) {
        return { success: false, error: 'Encuesta no encontrada o no válida' };
    }
    if (survey.status !== 'PUBLISHED') {
        return { success: false, error: 'Esta encuesta no está activa para recibir respuestas' };
    }
    if (!survey.allowMultipleResponses && userId) {
        const existingResponse = await prisma.surveyResponse.findFirst({
            where: { surveyId, userId }
        });
        if (existingResponse) {
            return { success: false, error: 'Ya has enviado una respuesta para esta encuesta.' };
        }
    }

    const newResponse = await prisma.surveyResponse.create({
      data: {
        surveyId,
        email: survey.isAnonymous ? null : email,
        userId: survey.isAnonymous ? null : userId,
        ipAddress,
        userAgent,
        isComplete,
        completedAt: isComplete ? new Date() : null,
        answers: {
          create: answers.map((answer) => ({
            questionId: answer.questionId,
            value: answer.value,
          })),
        },
      },
      include: { answers: true },
    });

    // Actualizar SurveyAnalytics
    await prisma.surveyAnalytics.upsert({
      where: {
        surveyId_date: {
          surveyId: surveyId,
          date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
        },
      },
      update: {
        starts: newResponse.isComplete ? { increment: 0 } : { increment: 1 },
        completions: newResponse.isComplete ? { increment: 1 } : { increment: 0 },
      },
      create: {
        surveyId: surveyId,
        date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
        starts: newResponse.isComplete ? 0 : 1,
        completions: newResponse.isComplete ? 1 : 0,
        views: 0,
      },
    });

    revalidatePath(`/surveys/${surveyId}/complete`); // O la ruta donde se muestra el éxito
    return { success: true, response: newResponse };
  } catch (error: any) {
    console.error('Error submitting survey response:', error);
    return { success: false, error: 'Error al enviar la respuesta de la encuesta' };
  }
}

// Actualizar una respuesta existente (ej. marcar como completada)
export async function updateSurveyResponse(responseId: string, formData: FormData) {
  const isComplete = formData.get('isComplete') === 'true';
  const rawAnswers = formData.get('answers') as string | null;

  let answers: { questionId: string; value: any }[] = [];
  if (rawAnswers) {
    try {
      answers = JSON.parse(rawAnswers);
      if (!Array.isArray(answers)) throw new Error('Answers must be an array.');
    } catch (e) {
      return { success: false, error: 'Formato de respuestas inválido.' };
    }
  }

  try {
    const existingResponse = await prisma.surveyResponse.findUnique({
        where: { id: responseId },
        select: { isComplete: true, surveyId: true }
    });

    if (!existingResponse) {
        return { success: false, error: 'Respuesta de encuesta no encontrada para actualizar' };
    }

    const dataToUpdate: any = {};
    if (isComplete !== undefined && isComplete !== existingResponse.isComplete) {
        dataToUpdate.isComplete = isComplete;
        dataToUpdate.completedAt = isComplete ? new Date() : null;
    }

    // Lógica para actualizar las respuestas individuales (Answers)
    if (answers.length > 0) {
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

    const updatedResponse = await prisma.surveyResponse.update({
      where: { id: responseId },
      data: dataToUpdate,
      include: { answers: true },
    });

    // Actualizar SurveyAnalytics si el estado de completitud cambia
    if (isComplete && !existingResponse.isComplete) {
        await prisma.surveyAnalytics.upsert({
            where: {
                surveyId_date: {
                    surveyId: existingResponse.surveyId,
                    date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
                },
            },
            update: { completions: { increment: 1 } },
            create: {
                surveyId: existingResponse.surveyId,
                date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
                views: 0, starts: 0, completions: 1,
            },
        });
    }

    revalidatePath(`/dashboard/responses/${responseId}`);
    revalidatePath(`/dashboard/surveys/${existingResponse.surveyId}`);
    return { success: true, response: updatedResponse };
  } catch (error: any) {
    console.error('Error updating survey response:', error);
    if (error.code === 'P2025') {
      return { success: false, error: 'Respuesta de encuesta no encontrada para actualizar' };
    }
    return { success: false, error: 'Error al actualizar la respuesta de la encuesta' };
  }
}

// Eliminar una respuesta
export async function deleteSurveyResponse(responseId: string) {
  let surveyId: string | null = null;
  try {
    const responseToDelete = await prisma.surveyResponse.findUnique({
      where: { id: responseId },
      select: { surveyId: true },
    });

    if (responseToDelete) {
      surveyId = responseToDelete.surveyId;
    }

    await prisma.surveyResponse.delete({ where: { id: responseId } });

    if (surveyId) {
      revalidatePath(`/dashboard/surveys/${surveyId}/responses`); // Revalidar la lista de respuestas de la encuesta
    }
    return { success: true, message: 'Respuesta de encuesta eliminada correctamente' };
  } catch (error: any) {
    console.error('Error deleting survey response:', error);
    if (error.code === 'P2025') {
      return { success: false, error: 'Respuesta de encuesta no encontrada para eliminar' };
    }
    return { success: false, error: 'Error al eliminar la respuesta de la encuesta' };
  }
}