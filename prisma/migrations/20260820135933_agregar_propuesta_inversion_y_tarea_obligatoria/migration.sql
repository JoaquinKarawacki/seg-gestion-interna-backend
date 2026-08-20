-- Datos de prueba: elimina cotizaciones "generales" (tarea_id IS NULL) antes
-- de forzar tarea_id a NOT NULL. Confirmado con el usuario que son solo
-- pruebas propias, no hay datos reales en juego.
UPDATE "ordenes_compra" SET "cotizacion_id" = NULL
  WHERE "cotizacion_id" IN (SELECT "id" FROM "cotizaciones" WHERE "tarea_id" IS NULL);
DELETE FROM "cotizaciones" WHERE "tarea_id" IS NULL;

-- DropForeignKey
ALTER TABLE "cotizaciones" DROP CONSTRAINT "cotizaciones_tarea_id_fkey";

-- AlterTable
ALTER TABLE "cotizaciones" DROP COLUMN "honorarios",
ALTER COLUMN "tarea_id" SET NOT NULL;

-- CreateTable
CREATE TABLE "propuestas_inversion" (
    "id" TEXT NOT NULL,
    "proyecto_id" TEXT NOT NULL,
    "costo_total_aproximado" DECIMAL(14,2) NOT NULL,
    "ahorro_mensual" DECIMAL(14,2) NOT NULL,
    "cantidad_meses" INTEGER NOT NULL,
    "porcentaje_seg" DECIMAL(5,2) NOT NULL,
    "moneda" "moneda" NOT NULL,
    "estado" "estado_cotizacion" NOT NULL DEFAULT 'ACTIVA',
    "archivo_ruta" TEXT,
    "archivo_mime_type" TEXT,
    "archivo_nombre_original" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propuestas_inversion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_inversion" ADD CONSTRAINT "propuestas_inversion_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
