-- CreateEnum
CREATE TYPE "estado_solicitud_compra" AS ENUM ('BORRADOR', 'PENDIENTE', 'APROBADO', 'RECHAZADO', 'ANULADO');

-- AlterTable
ALTER TABLE "ordenes_compra" ADD COLUMN     "solicitud_compra_id" TEXT;

-- CreateTable
CREATE TABLE "rubros" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rubros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_compra" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "tipo" "tipo_oc" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "solicitante_id" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,
    "proveedor_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "proyecto_id" TEXT NOT NULL,
    "rubro_id" TEXT NOT NULL,
    "tarea_id" TEXT NOT NULL,
    "cotizacion_id" TEXT NOT NULL,
    "moneda" "moneda" NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "concepto" TEXT NOT NULL,
    "paga_iva" BOOLEAN NOT NULL,
    "iva_incluido" BOOLEAN NOT NULL,
    "observaciones" TEXT,
    "archivo_pdf_ruta" TEXT NOT NULL,
    "estado" "estado_solicitud_compra" NOT NULL DEFAULT 'BORRADOR',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_estado_solicitud_compra" (
    "id" TEXT NOT NULL,
    "solicitud_compra_id" TEXT NOT NULL,
    "estado_anterior" "estado_solicitud_compra" NOT NULL,
    "estado_nuevo" "estado_solicitud_compra" NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "motivo" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estado_solicitud_compra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rubros_nombre_key" ON "rubros"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_compra_numero_key" ON "solicitudes_compra"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_compra_cotizacion_id_key" ON "solicitudes_compra"("cotizacion_id");

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_solicitud_compra_id_fkey" FOREIGN KEY ("solicitud_compra_id") REFERENCES "solicitudes_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_rubro_id_fkey" FOREIGN KEY ("rubro_id") REFERENCES "rubros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado_solicitud_compra" ADD CONSTRAINT "historial_estado_solicitud_compra_solicitud_compra_id_fkey" FOREIGN KEY ("solicitud_compra_id") REFERENCES "solicitudes_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado_solicitud_compra" ADD CONSTRAINT "historial_estado_solicitud_compra_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
