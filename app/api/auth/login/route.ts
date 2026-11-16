// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { withCors } from '@/lib/cors'
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, type Role } from '@/lib/session'

// Preflight request (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, {
    status: 200,
    headers: withCors(origin),
  })
}

// Login (POST)
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Se requiere correo electrónico y contraseña' },
        { status: 400, headers: withCors(origin) }
      )
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json(
        { message: 'Credenciales inválidas' },
        { status: 401, headers: withCors(origin) }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid || user.status !== 'ACTIVE') {
      return NextResponse.json(
        { message: 'Credenciales inválidas' },
        { status: 401, headers: withCors(origin) }
      )
    }

    const token = await signSession({ userId: user.id, email: user.email, role: user.role as Role })

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    })

    return NextResponse.json(
      {
        message: 'Inicio de sesión exitoso',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200, headers: withCors(origin) }
    )
  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500, headers: withCors(origin) }
    )
  }
}
