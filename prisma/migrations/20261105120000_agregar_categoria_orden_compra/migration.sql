-- Categoría de Orden de Compra + eliminación del Rubro.
-- Migración escrita a mano: `prisma migrate dev` está roto en este repo por el
-- setval() de la migración 20261007120000 sobre la shadow DB vacía. Aplicar con
-- `npx prisma migrate deploy`.

-- 1. Nuevo enum de categoría.
CREATE TYPE "categoria_orden_compra" AS ENUM (
  'PROYECTOS_ESCO',
  'PRODUCTOS_STOCK',
  'PRODUCTOS_REPOSICION',
  'INTERNO_SEG',
  'OTROS',
  'SEG_GREENPOWER',
  'SEG_HELIOTEC'
);

-- 2. Agregar `categoria`. Backfill: toda OC existente tiene proyecto => ESCO.
--    Se agrega con DEFAULT para poblar las filas actuales y luego se quita el
--    DEFAULT para que a futuro el valor sea siempre explícito.
ALTER TABLE "ordenes_compra"
  ADD COLUMN "categoria" "categoria_orden_compra" NOT NULL DEFAULT 'PROYECTOS_ESCO';
ALTER TABLE "ordenes_compra" ALTER COLUMN "categoria" DROP DEFAULT;

-- 3. OC: proyecto pasa a opcional (solo ESCO lo tiene; cliente_id ya era
--    opcional). El PDF adjunto pasa a opcional (obligatorio solo si monto sin
--    IVA >= 1000 USD, validado en el service). La cotización sigue obligatoria.
ALTER TABLE "ordenes_compra" ALTER COLUMN "proyecto_id" DROP NOT NULL;
ALTER TABLE "ordenes_compra" ALTER COLUMN "archivo_pdf_ruta" DROP NOT NULL;

-- 3b. Cotización: el proyecto pasa a opcional (las cotizaciones de OC no-ESCO no
--     tienen proyecto).
ALTER TABLE "cotizaciones" ALTER COLUMN "proyecto_id" DROP NOT NULL;

-- 4. Eliminar el Rubro por completo. DROP COLUMN se lleva la FK asociada sola
--    (en Postgres no hace falta DROP CONSTRAINT explícito, lo que además evita
--    depender del nombre del constraint, heredado del rename OC/OP).
ALTER TABLE "ordenes_compra" DROP COLUMN "rubro_id";
DROP TABLE "rubros";

-- 5. Eliminar la Tarea por completo. La Cotización pasa a colgar directo del
--    proyecto + de la OC (1:1), sin nivel intermedio. Cada DROP COLUMN se lleva
--    su FK. Se pierde el vínculo histórico a tarea (aceptado: nada en uso).
ALTER TABLE "cotizaciones" DROP COLUMN "tarea_id";
ALTER TABLE "ordenes_pago" DROP COLUMN "tarea_id";
ALTER TABLE "ordenes_compra" DROP COLUMN "tarea_id";
DROP TABLE "tareas";
