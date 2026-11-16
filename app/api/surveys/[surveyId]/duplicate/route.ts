// POST /api/surveys/[surveyId]/duplicate — copy a form (or create one from a template).
// Questions are copied with new ids and conditional logic is re-pointed to the copies.
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { withCors } from '@/lib/cors'
import { requireUser } from '@/lib/auth'
import { getLogic } from '@/lib/forms/logic'

interface Props {
  params: Promise<{ surveyId: string }>
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: withCors(req.headers.get('origin')) })
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'formulario'

export async function POST(request: NextRequest, { params }: Props) {
  const origin = request.headers.get('origin')
  const auth = await requireUser(request)
  if (auth.error) return auth.error
  const { surveyId } = await params
  const body = await request.json().catch(() => ({}))

  const source = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { questions: { orderBy: { order: 'asc' } } },
  })
  if (!source) {
    return NextResponse.json({ message: 'Formulario no encontrado' }, { status: 404, headers: withCors(origin) })
  }

  const fromTemplate = source.isTemplate && body?.asTemplate !== true
  const title =
    typeof body?.title === 'string' && body.title.trim()
      ? body.title.trim()
      : fromTemplate
        ? source.title
        : `${source.title} (copia)`
  const customLink = `${slug(title)}-${Math.random().toString(36).slice(2, 7)}`

  const copy = await prisma.$transaction(async (tx) => {
    const survey = await tx.survey.create({
      data: {
        title,
        description: source.description,
        customLink,
        status: 'DRAFT',
        isAnonymous: source.isAnonymous,
        showProgress: source.showProgress,
        allowMultipleResponses: source.allowMultipleResponses,
        collectEmail: source.collectEmail,
        isTemplate: body?.asTemplate === true,
        theme: source.theme ?? Prisma.DbNull,
        userId: auth.user.id,
      },
    })

    const idMap = new Map<string, string>()
    for (const q of source.questions) {
      const created = await tx.question.create({
        data: {
          surveyId: survey.id,
          title: q.title,
          description: q.description,
          type: q.type,
          required: q.required,
          order: q.order,
          options: q.options ?? Prisma.DbNull,
          validation: q.validation ?? Prisma.DbNull,
        },
      })
      idMap.set(q.id, created.id)
    }
    for (const q of source.questions) {
      const logic = getLogic(q)
      if (!logic) continue
      const showIf = logic.showIf
        .filter((c) => idMap.has(c.questionId))
        .map((c) => ({ ...c, questionId: idMap.get(c.questionId)! }))
      if (showIf.length) {
        await tx.question.update({
          where: { id: idMap.get(q.id)! },
          data: { logic: { match: logic.match, showIf } as unknown as Prisma.InputJsonValue },
        })
      }
    }
    return survey
  })

  return NextResponse.json(copy, { status: 201, headers: withCors(origin) })
}
