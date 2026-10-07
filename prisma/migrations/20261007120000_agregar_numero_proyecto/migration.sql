-- Agregar número secuencial a Proyecto, backfilleando los existentes por
-- antigüedad (creado_en) de forma determinística.

-- 1. Columna temporalmente nullable.
ALTER TABLE "proyectos" ADD COLUMN "numero" INTEGER;

-- 2. Backfill determinístico: 1..N por fecha de creación.
WITH ordenados AS (
  SELECT "id", row_number() OVER (ORDER BY "creado_en" ASC, "id" ASC) AS rn
  FROM "proyectos"
)
UPDATE "proyectos" p
SET "numero" = o.rn
FROM ordenados o
WHERE p."id" = o."id";

-- 3. Secuencia para los próximos proyectos, posicionada después del máximo actual.
CREATE SEQUENCE "proyectos_numero_seq";
SELECT setval('proyectos_numero_seq', COALESCE((SELECT MAX("numero") FROM "proyectos"), 0));

-- 4. Fijar NOT NULL + default autoincremental y atar la secuencia a la columna.
ALTER TABLE "proyectos" ALTER COLUMN "numero" SET NOT NULL;
ALTER TABLE "proyectos" ALTER COLUMN "numero" SET DEFAULT nextval('proyectos_numero_seq');
ALTER SEQUENCE "proyectos_numero_seq" OWNED BY "proyectos"."numero";

-- 5. Unicidad.
CREATE UNIQUE INDEX "proyectos_numero_key" ON "proyectos"("numero");
