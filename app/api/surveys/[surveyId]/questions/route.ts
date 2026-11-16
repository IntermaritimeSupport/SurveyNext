// app/api/surveys/[surveyId]/questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Prisma, QuestionType } from '@prisma/client'
import { getLogic } from '@/lib/forms/logic'
import prisma from '@/lib/prisma'
import { withCors } from '@/lib/cors'

// Preflight request (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: withCors(origin) });
}
interface ResponseDetailPageProps {
  params: Promise<{
    surveyId: string;
  }>;
}
// GET /api/surveys/[surveyId]/questions
export async function GET(request: NextRequest, {params: resolvedParams}: ResponseDetailPageProps) {
  const origin = request.headers.get('origin');
  const { surveyId } = await resolvedParams;
  try {
    const questions = await prisma.question.findMany({
      where: { surveyId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(questions || [], { status: 200, headers: withCors(origin) });
  } catch (error) {
    console.error(`Error fetching questions for survey ${surveyId}:`, error);
    return NextResponse.json({ message: 'Error al obtener las preguntas' }, { status: 500, headers: withCors(origin) });
  }
}

// POST /api/surveys/[surveyId]/questions
export async function POST(request: NextRequest, { params: resolvedParams }: ResponseDetailPageProps) {
  const origin = request.headers.get('origin');
  const { surveyId } = await resolvedParams;

  try {
    const body = await request.json();
    const clientQuestions: any[] = body.questions || [];

    // Validación preliminar de todas las preguntas antes de la transacción
    for (const q of clientQuestions) {
      if (!q.title || !q.type || q.order === undefined || q.order === null) {
        return NextResponse.json(
          { message: `Faltan campos obligatorios en una pregunta: title, type, order. Pregunta: ${JSON.stringify(q)}` },
          { status: 400, headers: withCors(origin) }
        );
      }
      if (!Object.values(QuestionType).includes(q.type)) {
        return NextResponse.json(
          { message: `Tipo de pregunta inválido para la pregunta "${q.title}": ${q.type}` },
          { status: 400, headers: withCors(origin) }
        );
      }
    }

    // Validar que la encuesta exista
    const surveyExists = await prisma.survey.findUnique({ where: { id: surveyId } });
    if (!surveyExists) {
      return NextResponse.json({ message: 'La encuesta especificada no existe' }, { status: 404, headers: withCors(origin) });
    }

    // IDs de preguntas existentes en DB
    const existingDbQuestions = await prisma.question.findMany({
      where: { surveyId },
      select: { id: true },
    });
    const existingDbQuestionIds = new Set(existingDbQuestions.map(q => q.id));
    const clientExistingQuestionIds = new Set(clientQuestions.filter(q => q.id).map(q => q.id));

    // Eliminar preguntas no enviadas por el cliente
    const questionsToDeleteIds = existingDbQuestions
      .filter(dbQ => !clientExistingQuestionIds.has(dbQ.id))
      .map(dbQ => dbQ.id);

    if (questionsToDeleteIds.length > 0) {
      await prisma.question.deleteMany({ where: { id: { in: questionsToDeleteIds } } });
    }

    // Crear o actualizar preguntas. Las condiciones (logic) pueden apuntar a preguntas
    // nuevas que todavía tienen un id temporal del editor ("new-..."), así que primero se
    // guardan las preguntas y después se escribe la lógica con los ids reales.
    await prisma.$transaction(async (tx) => {
      const idMap = new Map<string, string>();
      const savedByIndex: string[] = [];
      for (const q of clientQuestions) {
        const data: any = {
          title: q.title,
          description: q.description || null,
          type: q.type,
          required: q.required || false,
          order: q.order,
          options: q.options || null,
          validation: q.validation || null,
          surveyId,
        };
        const saved = q.id && existingDbQuestionIds.has(q.id)
          ? await tx.question.update({ where: { id: q.id }, data })
          : await tx.question.create({ data });
        savedByIndex.push(saved.id);
        if (q.id) idMap.set(q.id, saved.id);
      }

      const savedIds = new Set(savedByIndex);
      for (const [i, q] of clientQuestions.entries()) {
        const logic = getLogic(q);
        const mapped = logic
          ? {
              match: logic.match,
              showIf: logic.showIf
                .map(c => ({ ...c, questionId: idMap.get(c.questionId) ?? c.questionId }))
                .filter(c => savedIds.has(c.questionId)),
            }
          : null;
        await tx.question.update({
          where: { id: savedByIndex[i] },
          data: { logic: mapped && mapped.showIf.length ? (mapped as unknown as Prisma.InputJsonValue) : Prisma.DbNull },
        });
      }
    });

    const updatedQuestions = await prisma.question.findMany({
      where: { surveyId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(updatedQuestions, { status: 200, headers: withCors(origin) });
  } catch (error) {
    console.error(`Error synchronizing questions for survey ${surveyId}:`, error);
    return NextResponse.json(
      { message: 'Error al sincronizar las preguntas de la encuesta' },
      { status: 500, headers: withCors(origin) }
    );
  }
}
