-- Fase 2: los datos fijos del participante (fullName, company, position, ships)
-- pasan a ser preguntas normales del formulario, y sus valores a respuestas.
-- Afecta a las encuestas no anónimas y a cualquier encuesta que ya tenga datos de contacto.

BEGIN;

-- 1. Encuestas que reciben las preguntas de contacto
CREATE TEMP TABLE _contact_surveys ON COMMIT DROP AS
SELECT s.id
FROM "surveys" s
WHERE s."isAnonymous" = false
   OR EXISTS (
     SELECT 1 FROM "survey_responses" r
     WHERE r."surveyId" = s.id
       AND (r."fullName" IS NOT NULL OR r."company" IS NOT NULL OR r."position" IS NOT NULL OR r."ships" IS NOT NULL)
   );

-- 2. Hueco al principio del formulario: las preguntas existentes bajan 4 posiciones
UPDATE "questions" SET "order" = "order" + 4
WHERE "surveyId" IN (SELECT id FROM _contact_surveys);

-- 3. Una pregunta por campo, con las mismas etiquetas que mostraba el formulario
CREATE TEMP TABLE _contact_questions ON COMMIT DROP AS
SELECT cs.id AS survey_id, f.field, gen_random_uuid()::text AS question_id, f.title, f.qtype, f.ord
FROM _contact_surveys cs
CROSS JOIN (VALUES
  ('fullName', 'Full Name',                'TEXT',   0),
  ('company',  'Company name as per DOC',  'TEXT',   1),
  ('position', 'Position',                 'TEXT',   2),
  ('ships',    'Number of Ships with ICS', 'NUMBER', 3)
) AS f(field, title, qtype, ord);

INSERT INTO "questions" ("id", "title", "type", "required", "order", "surveyId", "createdAt", "updatedAt")
SELECT question_id, title, qtype::"QuestionType", false, ord, survey_id, now(), now()
FROM _contact_questions;

-- 4. Copiar los valores existentes como respuestas (ships se guarda como número JSON)
INSERT INTO "answers" ("id", "value", "questionId", "responseId", "createdAt")
SELECT gen_random_uuid()::text,
       CASE cq.field
         WHEN 'fullName' THEN to_jsonb(r."fullName")
         WHEN 'company'  THEN to_jsonb(r."company")
         WHEN 'position' THEN to_jsonb(r."position")
         WHEN 'ships'    THEN to_jsonb(r."ships")
       END,
       cq.question_id,
       r.id,
       COALESCE(r."completedAt", r."startedAt")
FROM "survey_responses" r
JOIN _contact_questions cq ON cq.survey_id = r."surveyId"
WHERE CASE cq.field
        WHEN 'fullName' THEN r."fullName"
        WHEN 'company'  THEN r."company"
        WHEN 'position' THEN r."position"
        WHEN 'ships'    THEN r."ships"::text
      END IS NOT NULL;

-- 5. Eliminar las columnas fijas
ALTER TABLE "survey_responses"
  DROP COLUMN "company",
  DROP COLUMN "fullName",
  DROP COLUMN "position",
  DROP COLUMN "ships";

-- 6. Nuevo ajuste: pedir email al participante (antes implícito en "no anónimo")
ALTER TABLE "surveys" ADD COLUMN "collectEmail" BOOLEAN NOT NULL DEFAULT true;
UPDATE "surveys" SET "collectEmail" = NOT "isAnonymous";

COMMIT;
