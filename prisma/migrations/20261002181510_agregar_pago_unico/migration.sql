-- AlterTable
ALTER TABLE "solicitudes_compra" ADD COLUMN     "es_pago_unico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pago_unico_forma_pago" "forma_pago";
