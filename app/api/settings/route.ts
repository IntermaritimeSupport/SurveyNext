// Organization defaults for public forms (logo, color, thank-you message), stored in SystemSetting.
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withCors } from '@/lib/cors'
import { requireUser, ADMIN_ROLES } from '@/lib/auth'
import { FORM_DEFAULTS_KEY, sanitizeTheme } from '@/lib/forms/theme'

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: withCors(req.headers.get('origin')) })
}

// GET /api/settings (staff; protected by middleware)
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  const row = await prisma.systemSetting.findUnique({ where: { key: FORM_DEFAULTS_KEY } })
  return NextResponse.json({ formDefaults: sanitizeTheme(row?.value) }, { status: 200, headers: withCors(origin) })
}

// PUT /api/settings (SUPERADMIN / ADMIN)
export async function PUT(request: NextRequest) {
  const origin = request.headers.get('origin')
  const auth = await requireUser(request, ADMIN_ROLES)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  const value = sanitizeTheme(body?.formDefaults)
  await prisma.systemSetting.upsert({
    where: { key: FORM_DEFAULTS_KEY },
    update: { value: value as object },
    create: { key: FORM_DEFAULTS_KEY, value: value as object },
  })
  return NextResponse.json({ formDefaults: value }, { status: 200, headers: withCors(origin) })
}
