-- DropIndex
DROP INDEX "proyectos_numero_key";

-- AlterTable
ALTER TABLE "proyectos" DROP COLUMN "numero",
ADD COLUMN     "codigo_inversion" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "proyectos_codigo_inversion_key" ON "proyectos"("codigo_inversion");
