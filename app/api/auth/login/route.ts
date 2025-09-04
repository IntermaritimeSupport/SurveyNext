// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const allowedOrigins = [
  'http://localhost:3000',
  'https://survey-next-git-main-intermaritime.vercel.app',
  'https://surveys.intermaritime.org',
]

// Función auxiliar para CORS
function withCors(origin: string | null) {
  const isAllowed = origin && allowedOrigins.includes(origin)
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
  }
}

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
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Credenciales inválidas' },
        { status: 401, headers: withCors(origin) }
      )
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) throw new Error('JWT_SECRET no está definido.')

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '1h' }
    )

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    const cookieStore = await cookies()
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60,
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
