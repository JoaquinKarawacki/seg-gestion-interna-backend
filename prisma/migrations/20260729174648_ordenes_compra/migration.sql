-- CreateEnum
CREATE TYPE "tipo_oc" AS ENUM ('ARTICULO', 'SERVICIO');

-- CreateEnum
CREATE TYPE "forma_pago" AS ENUM ('CONTADO_CONTRA_ENTREGA', 'TARJETA_CREDITO', 'DIFERIDO', 'GIRO_RED_COBRANZA', 'TRANSFERENCIA_BANCARIA');

-- CreateEnum
CREATE TYPE "estado_oc" AS ENUM ('BORRADOR', 'PENDIENTE', 'EN_CONSULTA', 'APROBADO', 'RECHAZADO', 'PAGO_OBSERVADO', 'PAGADO', 'ANULADO');

-- AlterEnum
ALTER TYPE "moneda" ADD VALUE 'EUR';

-- AlterEnum
ALTER TYPE "tipo_cuenta_bancaria" ADD VALUE 'EXTERIOR';

-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN     "tarea_id" TEXT;

-- CreateTable
CREATE TABLE "tareas" (
    "id" TEXT NOT NULL,
    "proyecto_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateSequence
CREATE SEQUENCE "numero_orden_compra_seq" START 1;

-- CreateTable
CREATE TABLE "ordenes_compra" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL DEFAULT nextval('numero_orden_compra_seq'),
    "tipo" "tipo_oc" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "sector_id" TEXT NOT NULL,
    "proveedor_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "proyecto_id" TEXT,
    "tarea_id" TEXT,
    "cotizacion_id" TEXT,
    "moneda" "moneda" NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "concepto" TEXT NOT NULL,
    "forma_pago" "forma_pago" NOT NULL,
    "paga_iva" BOOLEAN NOT NULL,
    "iva_incluido" BOOLEAN NOT NULL,
    "observaciones" TEXT,
    "factura_pdf_ruta" TEXT,
    "estado" "estado_oc" NOT NULL DEFAULT 'BORRADOR',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_compra_numero_key" ON "ordenes_compra"("numero");

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
