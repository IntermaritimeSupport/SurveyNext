// app/api/surveys/[surveyId]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, QuestionType, SurveyStatus } from '@prisma/client'
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
export async function PUT(request: Request, { params }: { params: { surveyId: string | Promise<string> } }) {
  // ✅ CORRECCIÓN: Resuelve la promesa de params al principio y asegura el tipo string
  const resolvedParams = await params;
  const surveyId: string = resolvedParams.surveyId as string; // Cast a string para TypeScript

  try {
    const body = await request.json();  
    console.log('DEBUG (Backend PUT): Received payload for surveyId:', surveyId);
    console.log('DEBUG (Backend PUT): Received body:', JSON.stringify(body, null, 2));

    // Desestructuramos las propiedades del body.
    // Evitamos desestructurar 'status' para no sombrear el enum 'SurveyStatus'.
    const {
      title,
      description,
      customLink,
      isAnonymous,
      showProgress,
      allowMultipleResponses,
      startDate,
      endDate,
      isPublished, // ✅ Usamos este booleano para definir el estado
      questions: incomingQuestions, // Preguntas que vienen del frontend
      // No desestructuramos 'status' (el del body), 'id', 'createdAt', 'updatedAt', 'userId'
    } = body;

    // Validación básica
    if (!title || !customLink) {
        return NextResponse.json({ message: 'El título y el enlace personalizado son obligatorios.' }, { status: 400 });
    }

    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    // ✅ CORRECCIÓN: Determinamos el SurveyStatus basado en isPublished
    const newSurveyStatus = isPublished ? SurveyStatus.PUBLISHED : SurveyStatus.DRAFT;
    console.log('DEBUG (Backend PUT): New Survey Status to be applied:', newSurveyStatus);


    const transactionResult = await prisma.$transaction(async (tx) => {
        // --- Lógica de Sincronización de Preguntas ---
        const existingDbQuestions = await tx.question.findMany({
            where: { surveyId: surveyId }, // ✅ surveyId ya es de tipo string
            select: { id: true, title: true, order: true, options: true, validation: true }
        });
        const existingDbQuestionIds = new Set(existingDbQuestions.map(q => q.id));
        
        const incomingQuestionIdsToKeep = new Set(
            incomingQuestions
                .filter((q: any) => q.id && typeof q.id === 'string' && !q.id.startsWith('question-'))
                .map((q: any) => q.id)
        );

        const questionsToDeleteIds = [...existingDbQuestionIds].filter(
            dbId => !incomingQuestionIdsToKeep.has(dbId)
        );
        
        if (questionsToDeleteIds.length > 0) {
            console.log('DEBUG (Backend PUT): Identified questions for DELETION:', questionsToDeleteIds);
            await tx.question.deleteMany({
                where: {
                    id: { in: questionsToDeleteIds },
                    surveyId: surveyId // ✅ surveyId ya es de tipo string
                }
            });
        }

        const createOperations: Promise<any>[] = [];
        const updateOperations: Promise<any>[] = [];

        for (const q of incomingQuestions) {
            if (!q.title || !q.type || q.order === undefined || q.order === null) {
                throw new Error(`Faltan campos obligatorios en una pregunta: title, type, order. Pregunta: ${JSON.stringify(q)}`);
            }
            // Asegúrate de que q.type es un string antes de usar Object.values
            if (typeof q.type !== 'string' || !Object.values(QuestionType).includes(q.type as QuestionType)) {
                throw new Error(`Tipo de pregunta inválido para la pregunta "${q.title}": ${q.type}`);
            }

            const questionData = { // Ya no es 'any' aquí
                title: q.title,
                description: q.description ?? null,
                type: q.type as QuestionType, // ✅ Aseguramos que el tipo sea QuestionType
                required: q.required ?? false,
                order: q.order,
                options: q.options ?? null,    // Prisma Json type
                validation: q.validation ?? null, // Prisma Json type
                surveyId: surveyId, // ✅ surveyId ya es de tipo string
            };

            if (q.id && typeof q.id === 'string' && !q.id.startsWith('question-') && existingDbQuestionIds.has(q.id)) {
                console.log('DEBUG (Backend PUT): Identified question for UPDATE. ID:', q.id, 'Title:', q.title);
                updateOperations.push(tx.question.update({
                    where: { id: q.id },
                    data: questionData,
                }));
            } else if (!q.id || (typeof q.id === 'string' && q.id.startsWith('question-'))) {
                console.log('DEBUG (Backend PUT): Identified question for CREATE. Title:', q.title);
                createOperations.push(tx.question.create({
                    data: questionData,
                }));
            } else {
                console.warn('DEBUG (Backend PUT): Skipping question due to unhandled ID logic or invalid ID:', q.id, q.title);
            }
        }

        await Promise.all([...updateOperations, ...createOperations]);

        // --- Actualización de la Encuesta Principal ---
        const updatedSurvey = await tx.survey.update({
            where: { id: surveyId }, // ✅ surveyId ya es de tipo string
            data: {
                title,
                description,
                customLink,
                status: newSurveyStatus, // ✅ Usa la variable 'newSurveyStatus'
                isAnonymous,
                showProgress,
                allowMultipleResponses,
                startDate: parsedStartDate,
                endDate: parsedEndDate,
            },
            include: {
                questions: {
                    orderBy: { order: 'asc' }
                },
                user: { select: { id: true, name: true, email: true } },
            },
        });

        return updatedSurvey;
    });

    return NextResponse.json(transactionResult, { status: 200 });
  } catch (error: any) {
    console.error('ERROR (Backend PUT): Error updating survey:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('customLink')) {
      return NextResponse.json({ message: 'El enlace personalizado ya está en uso' }, { status: 409 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Encuesta no encontrada para actualizar' }, { status: 404 });
    }
    if (error.message.includes('Faltan campos obligatorios') || error.message.includes('Tipo de pregunta inválido')) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error al actualizar la encuesta', details: error.message }, { status: 500 });
  } finally {
    // Es mejor no desconectar Prisma en cada solicitud en Next.js
  }
}

// ... (DELETE route - también necesita await params)
export async function DELETE(request: Request, { params }: { params: { surveyId: string } }) {
  const { surveyId } = params; 

  try {
    await prisma.survey.delete({
      where: { id: surveyId },
    });
    return new NextResponse(null, { status: 204 }); 

  } catch (error: any) {
    console.error('Error deleting survey:', error);

    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Encuesta no encontrada para eliminar' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error interno del servidor al eliminar la encuesta' }, { status: 500 });
  }
}