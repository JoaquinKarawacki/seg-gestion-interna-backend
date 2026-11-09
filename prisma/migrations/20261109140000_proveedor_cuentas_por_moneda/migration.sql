-- Cuentas bancarias del proveedor por moneda (pesos y dólares). Se agregan las
-- columnas nullable, se migra la cuenta existente a "pesos" (caso más común) y se
-- elimina la columna única anterior.
ALTER TABLE "proveedores" ADD COLUMN "numero_cuenta_pesos" TEXT;
ALTER TABLE "proveedores" ADD COLUMN "numero_cuenta_dolares" TEXT;

UPDATE "proveedores" SET "numero_cuenta_pesos" = "numero_cuenta";

ALTER TABLE "proveedores" DROP COLUMN "numero_cuenta";
