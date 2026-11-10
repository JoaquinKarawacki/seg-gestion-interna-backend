-- Reorganización de sectores (migración de DATOS, no de esquema).
-- Objetivo: dejar la base igual en todos los entornos sin depender de los UUID
-- locales. Todo se resuelve por "nombre"/"email" y es idempotente: se puede
-- re-correr sin duplicar ni romper. Si un usuario no existe en el entorno, el
-- UPDATE/INSERT afecta 0 filas (no falla).
--
-- Cambios:
--   1. Renombrar sector "RENOVABLES" -> "Renovables - ESCO" (cualquier casing).
--   2. Crear sector "SEG Green Power".
--   3. Crear usuario mgonzalez si no existe (ADMIN, contraseña provisoria "Cambiar123!").
--   4. Pertenencia: lanza y piedracueva -> SEG Green Power; foglino -> Renovables - ESCO.
--   5. Renovables - ESCO queda con foglino como ÚNICO miembro.
--   6. Encargados: piedracueva -> SEG Green Power; mgonzalez ÚNICO encargado de Renovables - ESCO.

-- 1) Rename (tolerante a mayúsculas; solo si no existe ya el nuevo).
UPDATE "sectores"
SET "nombre" = 'Renovables - ESCO', "actualizado_en" = CURRENT_TIMESTAMP
WHERE upper("nombre") = 'RENOVABLES'
  AND NOT EXISTS (SELECT 1 FROM "sectores" WHERE "nombre" = 'Renovables - ESCO');

-- 2) Crear "SEG Green Power" si no existe.
INSERT INTO "sectores" ("id", "nombre", "creado_en", "actualizado_en")
SELECT gen_random_uuid()::text, 'SEG Green Power', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "sectores" WHERE "nombre" = 'SEG Green Power');

-- 3) Crear usuario mgonzalez si no existe (ADMIN, sin sector de pertenencia).
--    Si ya existe (p. ej. en prod ya está como Administrador) no se toca su rol.
INSERT INTO "usuarios" (
  "id", "nombre", "email", "contrasena_hash", "roles", "activo",
  "sector_id", "creado_en", "actualizado_en"
)
SELECT
  gen_random_uuid()::text,
  'Manuel Gonzalez',
  'mgonzalez@segingenieria.com',
  '$2b$10$cG/wvnaGZX2WK1qkXUnYIuP9Vbo1tfLz0qXgEAD2ZXbStOVFl2ida',
  ARRAY['ADMIN']::"rol_usuario"[],
  true,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "usuarios" WHERE "email" = 'mgonzalez@segingenieria.com'
);

-- 4) Pertenencia (sector_id) por email.
UPDATE "usuarios"
SET "sector_id" = (SELECT "id" FROM "sectores" WHERE "nombre" = 'SEG Green Power'),
    "actualizado_en" = CURRENT_TIMESTAMP
WHERE "email" IN ('lanza@segingenieria.com', 'piedracueva@segingenieria.com');

UPDATE "usuarios"
SET "sector_id" = (SELECT "id" FROM "sectores" WHERE "nombre" = 'Renovables - ESCO'),
    "actualizado_en" = CURRENT_TIMESTAMP
WHERE "email" = 'foglino@segingenieria.com';

-- 5) Renovables - ESCO: foglino como ÚNICO miembro. Cualquier otro que haya
--    quedado con pertenencia a ese sector pasa a "sin sector" (sector_id NULL).
--    (lanza/piedracueva ya se movieron a Green Power en el paso 4.)
UPDATE "usuarios"
SET "sector_id" = NULL, "actualizado_en" = CURRENT_TIMESTAMP
WHERE "sector_id" = (SELECT "id" FROM "sectores" WHERE "nombre" = 'Renovables - ESCO')
  AND "email" <> 'foglino@segingenieria.com';

-- 6) Encargados (join _SectorEncargados: A = sector, B = usuario).
--    6a) piedracueva -> encargado de SEG Green Power.
INSERT INTO "_SectorEncargados" ("A", "B")
SELECT s."id", u."id"
FROM "sectores" s, "usuarios" u
WHERE s."nombre" = 'SEG Green Power'
  AND u."email" = 'piedracueva@segingenieria.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_SectorEncargados" x WHERE x."A" = s."id" AND x."B" = u."id"
  );

--    6b) mgonzalez -> encargado de Renovables - ESCO.
INSERT INTO "_SectorEncargados" ("A", "B")
SELECT s."id", u."id"
FROM "sectores" s, "usuarios" u
WHERE s."nombre" = 'Renovables - ESCO'
  AND u."email" = 'mgonzalez@segingenieria.com'
  AND NOT EXISTS (
    SELECT 1 FROM "_SectorEncargados" x WHERE x."A" = s."id" AND x."B" = u."id"
  );

--    6c) mgonzalez como ÚNICO encargado de Renovables - ESCO: borrar cualquier
--        otro encargado viejo de ese sector.
DELETE FROM "_SectorEncargados"
WHERE "A" = (SELECT "id" FROM "sectores" WHERE "nombre" = 'Renovables - ESCO')
  AND "B" <> (SELECT "id" FROM "usuarios" WHERE "email" = 'mgonzalez@segingenieria.com');
