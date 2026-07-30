-- CreateTable
CREATE TABLE "historial_estado_oc" (
    "id" TEXT NOT NULL,
    "orden_compra_id" TEXT NOT NULL,
    "estado_anterior" "estado_oc" NOT NULL,
    "estado_nuevo" "estado_oc" NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "motivo" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estado_oc_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "historial_estado_oc" ADD CONSTRAINT "historial_estado_oc_orden_compra_id_fkey" FOREIGN KEY ("orden_compra_id") REFERENCES "ordenes_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado_oc" ADD CONSTRAINT "historial_estado_oc_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
