-- Fase 4b: marca por formulario y plantillas
ALTER TABLE "surveys" ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "surveys" ADD COLUMN "theme" JSONB;

-- Los formularios existentes mostraban siempre el logo de ICS: se conserva su aspecto.
UPDATE "surveys" SET "theme" = '{"logoUrl": "/ics-logo.jpg"}'::jsonb WHERE "theme" IS NULL;
