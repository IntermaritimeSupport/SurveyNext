# SurveyNext

Herramienta de formularios y encuestas: Next.js 15 (App Router), Prisma y PostgreSQL.

## Requisitos

- Node.js 22.18 o superior (el seed se ejecuta como TypeScript directamente con `node`)
- PostgreSQL 14 o superior
- npm

## Instalación local

```bash
git clone git@github.com:IntermaritimeSupport/SurveyNext.git
cd SurveyNext
npm install

# 1. Variables de entorno
cp .env.example .env
#    Edita .env: DATABASE_URL, JWT_SECRET (openssl rand -hex 32), ADMIN_EMAIL, ADMIN_PASSWORD

# 2. Base de datos
createdb surveynext            # o crea la base con tu herramienta preferida
npx prisma generate
npx prisma migrate deploy

# 3. Usuario administrador
npm run seed

# 4. Arrancar
npm run dev                    # http://localhost:3000
```

Entra en `/auth/login` con `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | `prisma generate --no-engine` + `next build` (pensado para Vercel) |
| `npm run typecheck` | Comprobación de tipos con `tsc --noEmit` |
| `npm run seed` | Crea o actualiza el usuario administrador desde `.env` |

> `npm run build` genera el cliente de Prisma sin motor (`--no-engine`). Si después quieres volver a `npm run dev` en local, ejecuta `npx prisma generate`.

## Estructura

- `app/admin/*`: panel de administración (encuestas, respuestas, usuarios, informes)
- `app/survey/[customLink]`: formulario público
- `app/api/*`: rutas de la API
- `components/survey-builder/*`: editor de encuestas (`survey-manager` → `QuestionManager` → `QuestionItemEditor`)
- `components/survey-public/*`: renderizado del formulario público
- `lib/prisma.ts`, `lib/cors.ts`: cliente de Prisma compartido y cabeceras CORS
- `prisma/schema.prisma`: modelo de datos y migraciones
