-- CreateTable
CREATE TABLE "_SectorEncargados" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SectorEncargados_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SectorEncargados_B_index" ON "_SectorEncargados"("B");

-- AddForeignKey
ALTER TABLE "_SectorEncargados" ADD CONSTRAINT "_SectorEncargados_A_fkey" FOREIGN KEY ("A") REFERENCES "sectores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SectorEncargados" ADD CONSTRAINT "_SectorEncargados_B_fkey" FOREIGN KEY ("B") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: todo ENCARGADO existente ya podía aprobar el sector que tenía
-- asignado en "sector_id" — se preserva ese permiso en la nueva relación
-- muchos-a-muchos, que pasa a ser la fuente de verdad para "qué sectores
-- puede aprobar este usuario".
INSERT INTO "_SectorEncargados" ("A", "B")
SELECT sector_id, id FROM usuarios WHERE rol = 'ENCARGADO' AND sector_id IS NOT NULL;
