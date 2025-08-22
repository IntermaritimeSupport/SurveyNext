// app/api/surveys/[surveyId]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// GET /api/surveys/[surveyId] - Obtener una encuesta por ID
export async function GET(request: Request, { params }: { params: { surveyId: string } }) {
  const { surveyId } = await params;

  try {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: true,
      },
    });

    if (!survey) {
      return NextResponse.json({ message: 'Encuesta no encontrada' }, { status: 404 });
    }

    const processedQuestions = survey.questions.map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      validation: typeof q.validation === 'string' ? JSON.parse(q.validation) : q.validation,
    }));

    const processedSurvey = {
      ...survey,
      questions: processedQuestions,
    };

    return NextResponse.json(processedSurvey);
  } catch (error) {
    console.error(`Error fetching survey ${surveyId}:`, error);
    return NextResponse.json({ message: 'Error al obtener la encuesta' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// PUT /api/surveys/[surveyId] - Actualizar una encuesta por ID
export async function PUT(request: Request, { params }: { params: { surveyId: string } }) {
  const { surveyId } = await params;

  try {
    const body = await request.json();
    const {
      title,
      description,
      customLink,
      status,
      isAnonymous,
      showProgress,
      allowMultipleResponses,
      startDate,
      endDate,
      questions: incomingQuestions // Preguntas que vienen del frontend
    } = body;

    console.log('DEBUG (Backend PUT): Received payload for surveyId:', surveyId);
    console.log('DEBUG (Backend PUT): Survey title:', title);
    console.log('DEBUG (Backend PUT): Number of incoming questions:', incomingQuestions.length);
    // console.log('DEBUG (Backend PUT): Incoming questions details:', JSON.stringify(incomingQuestions, null, 2)); // Descomenta solo para depuración pesada

    if (!title || !customLink) {
        return NextResponse.json({ message: 'El título y el enlace personalizado son obligatorios.' }, { status: 400 });
    }

    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    const transactionResult = await prisma.$transaction(async (tx) => {
        const existingDbQuestions = await tx.question.findMany({
            where: { surveyId: surveyId },
            select: { id: true, title: true, order: true } // Selecciona más campos para depuración
        });
        const existingDbQuestionIds = new Set(existingDbQuestions.map(q => q.id));
        
        const incomingQuestionIdsToKeep = new Set(
            incomingQuestions
                .map((q: any) => q.id)
                .filter((id: string) => id && !id.startsWith('question-'))
        );

        const questionsToDeleteIds = [...existingDbQuestionIds].filter(
            dbId => !incomingQuestionIdsToKeep.has(dbId)
        );
        
        if (questionsToDeleteIds.length > 0) {
            console.log('DEBUG (Backend PUT): Identified questions for DELETION:', questionsToDeleteIds);
            await tx.question.deleteMany({
                where: {
                    id: { in: questionsToDeleteIds },
                    surveyId: surveyId
                }
            });
        }

        const createOperations: Promise<any>[] = [];
        const updateOperations: Promise<any>[] = [];

        for (const q of incomingQuestions) {
            const questionData = {
                title: q.title,
                description: q.description,
                type: q.type,
                required: q.required ?? false,
                order: q.order,
                // --- CORRECCIÓN AQUÍ: Parsear antes de pasar a Prisma ---
                // Esto es una medida de seguridad, incluso si el frontend ya envía JSON.stringify
                // Asegura que Prisma siempre reciba un objeto/array JS para Json?.
                options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options ?? null,
                validation: typeof q.validation === 'string' ? JSON.parse(q.validation) : q.validation ?? null,
                // --- FIN CORRECCIÓN ---
                surveyId: surveyId,
            };

            if (q.id && !q.id.startsWith('question-') && existingDbQuestionIds.has(q.id)) {
                // Actualizar pregunta existente
                console.log('DEBUG (Backend PUT): Identified question for UPDATE. ID:', q.id, 'Title:', q.title);
                updateOperations.push(tx.question.update({
                    where: { id: q.id },
                    data: questionData,
                }));
            } else if (!q.id || q.id.startsWith('question-')) { // Es una nueva pregunta (sin ID o con ID temporal)
                console.log('DEBUG (Backend PUT): Identified question for CREATE. Title:', q.title);
                createOperations.push(tx.question.create({
                    data: questionData, // Dejar que Prisma genere el ID
                }));
            } else {
                console.warn('DEBUG (Backend PUT): Skipping question due to unhandled ID logic:', q.id, q.title);
            }
        }

        await Promise.all([...updateOperations, ...createOperations]);

        const updatedSurvey = await tx.survey.update({
            where: { id: surveyId },
            data: {
                title,
                description,
                customLink,
                status,
                isAnonymous,
                showProgress,
                allowMultipleResponses,
                startDate: parsedStartDate,
                endDate: parsedEndDate,
            },
            include: {
                questions: true,
            },
        });

        return updatedSurvey;
    });

    const processedQuestions = transactionResult.questions.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        validation: typeof q.validation === 'string' ? JSON.parse(q.validation) : q.validation,
    }));

    const processedUpdatedSurvey = {
        ...transactionResult,
        questions: processedQuestions,
    };

    return NextResponse.json(processedUpdatedSurvey, { status: 200 });
  } catch (error: any) {
    console.error('ERROR (Backend PUT): Error updating survey:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('customLink')) {
      return NextResponse.json({ message: 'El enlace personalizado ya está en uso' }, { status: 409 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Encuesta no encontrada para actualizar' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al actualizar la encuesta', details: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE /api/surveys/[surveyId] - Eliminar una encuesta por ID
export async function DELETE(request: Request, { params }: { params: { surveyId: string } }) {
  const { surveyId } = await params;

  try {
    await prisma.survey.delete({
      where: { id: surveyId },
    });
    return NextResponse.json({ message: 'Encuesta eliminada correctamente' }, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting survey:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Encuesta no encontrada para eliminar' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al eliminar la encuesta' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}