# SurveyNext

Herramienta de formularios y encuestas: Next.js 15 (App Router), Prisma y PostgreSQL.

## Requisitos

- Node.js 22.18 o superior (el seed se ejecuta como TypeScript directamente con `node`)
- PostgreSQL 14 o superior
- pnpm 10 (`npm install -g pnpm@10`). **No uses `npm install`**: Vercel instala con `pnpm-lock.yaml` y un lockfile desactualizado rompe el build.

## Instalación local

```bash
git clone git@github.com:IntermaritimeSupport/SurveyNext.git
cd SurveyNext
pnpm install

# 1. Variables de entorno
cp .env.example .env
#    Edita .env: DATABASE_URL, JWT_SECRET (openssl rand -hex 32), ADMIN_EMAIL, ADMIN_PASSWORD

# 2. Base de datos
createdb surveynext            # o crea la base con tu herramienta preferida
pnpm prisma generate
pnpm prisma migrate deploy

# 3. Usuario administrador
pnpm seed

# 4. Arrancar
pnpm dev                    # http://localhost:3000
```

Entra en `/auth/login` con `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Scripts

| Script | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo (Turbopack) |
| `pnpm build` | `prisma generate --no-engine` + `next build` (pensado para Vercel) |
| `pnpm typecheck` | Comprobación de tipos con `tsc --noEmit` |
| `pnpm seed` | Crea o actualiza el usuario administrador desde `.env` |

> `pnpm build` genera el cliente de Prisma sin motor (`--no-engine`). Si después quieres volver a `pnpm dev` en local, ejecuta `pnpm prisma generate`.

## Estructura

- `app/admin/*`: panel de administración (encuestas, respuestas, usuarios, informes)
- `app/survey/[customLink]`: formulario público
- `app/api/*`: rutas de la API
- `components/survey-builder/*`: editor de encuestas (`survey-manager` → `QuestionManager` → `QuestionItemEditor`)
- `components/survey-public/*`: renderizado del formulario público
- `lib/prisma.ts`, `lib/cors.ts`: cliente de Prisma compartido y cabeceras CORS
- `prisma/schema.prisma`: modelo de datos y migraciones

## Dependencias

Añade o quita paquetes siempre con pnpm (`pnpm add <paquete>`, `pnpm remove <paquete>`) y commitea `pnpm-lock.yaml`.
