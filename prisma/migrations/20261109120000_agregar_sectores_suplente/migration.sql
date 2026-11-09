-- CreateTable
CREATE TABLE "_SectorSuplentes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SectorSuplentes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SectorSuplentes_B_index" ON "_SectorSuplentes"("B");

-- AddForeignKey
ALTER TABLE "_SectorSuplentes" ADD CONSTRAINT "_SectorSuplentes_A_fkey" FOREIGN KEY ("A") REFERENCES "sectores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SectorSuplentes" ADD CONSTRAINT "_SectorSuplentes_B_fkey" FOREIGN KEY ("B") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
