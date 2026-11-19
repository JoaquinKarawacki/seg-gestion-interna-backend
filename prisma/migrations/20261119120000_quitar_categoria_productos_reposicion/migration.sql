-- Elimina la categoría de OC "Productos - Reposición" (PRODUCTOS_REPOSICION).
-- Migración escrita a mano: `prisma migrate dev` está roto en este repo por el
-- setval() de la migración 20261007120000 sobre la shadow DB vacía. Aplicar con
-- `npx prisma migrate deploy`.

-- 1. Las OC existentes con esa categoría pasan a "Productos - Stock".
UPDATE "ordenes_compra"
  SET "categoria" = 'PRODUCTOS_STOCK'
  WHERE "categoria" = 'PRODUCTOS_REPOSICION';

-- 2. Postgres no permite quitar un valor de un enum: se recrea el tipo sin él y
--    se convierte la columna (no tiene DEFAULT, así que el cambio es directo).
ALTER TYPE "categoria_orden_compra" RENAME TO "categoria_orden_compra_old";

CREATE TYPE "categoria_orden_compra" AS ENUM (
  'PROYECTOS_ESCO',
  'PRODUCTOS_STOCK',
  'INTERNO_SEG',
  'OTROS',
  'SEG_GREENPOWER',
  'SEG_HELIOTEC'
);

ALTER TABLE "ordenes_compra"
  ALTER COLUMN "categoria" TYPE "categoria_orden_compra"
  USING "categoria"::text::"categoria_orden_compra";

DROP TYPE "categoria_orden_compra_old";
