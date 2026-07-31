/*
  Warnings:

  - Added the required column `solicitante_id` to the `ordenes_compra` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ordenes_compra" ADD COLUMN     "solicitante_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "comentarios" (
    "id" TEXT NOT NULL,
    "orden_compra_id" TEXT NOT NULL,
    "autor_id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_orden_compra_id_fkey" FOREIGN KEY ("orden_compra_id") REFERENCES "ordenes_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
