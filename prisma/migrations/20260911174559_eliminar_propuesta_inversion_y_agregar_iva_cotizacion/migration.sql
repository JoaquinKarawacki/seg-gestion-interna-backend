-- DropForeignKey
ALTER TABLE "propuestas_inversion" DROP CONSTRAINT "propuestas_inversion_proyecto_id_fkey";

-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN     "iva_incluido" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "proyectos" DROP COLUMN "costo_seg_manual";

-- DropTable
DROP TABLE "propuestas_inversion";

