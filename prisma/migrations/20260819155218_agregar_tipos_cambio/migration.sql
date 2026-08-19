-- CreateTable
CREATE TABLE "tipos_cambio" (
    "id" TEXT NOT NULL,
    "moneda" "moneda" NOT NULL,
    "valor_en_uyu" DECIMAL(14,4) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_cambio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_cambio_moneda_key" ON "tipos_cambio"("moneda");
