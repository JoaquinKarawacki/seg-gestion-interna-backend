-- AlterTable
ALTER TABLE "proyectos" ADD COLUMN     "sector_id" TEXT;

-- AddForeignKey
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
