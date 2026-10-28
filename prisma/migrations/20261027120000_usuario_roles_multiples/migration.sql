-- Multi-rol: Usuario.rol (escalar) -> Usuario.roles (array). Preserva datos:
-- cada usuario pasa a tener exactamente el rol que tenía, como lista de uno.

-- 1. Columna nueva, temporalmente con default vacío para poder marcarla NOT NULL
--    sobre las filas existentes.
ALTER TABLE "usuarios"
  ADD COLUMN "roles" "rol_usuario"[] NOT NULL DEFAULT ARRAY[]::"rol_usuario"[];

-- 2. Backfill: roles = [rol] para cada fila.
UPDATE "usuarios" SET "roles" = ARRAY["rol"]::"rol_usuario"[];

-- 3. Baja la columna vieja.
ALTER TABLE "usuarios" DROP COLUMN "rol";

-- 4. Saca el default para que el schema (sin @default) coincida con la DB.
ALTER TABLE "usuarios" ALTER COLUMN "roles" DROP DEFAULT;
