-- Rename físico + swap: OrdenCompra(OP) -> OrdenPago, SolicitudCompra -> OrdenCompra.
-- Solo renombres (preserva datos). Orden anti-colisión: primero se libera cada
-- nombre (tabla/enum/historial) renombrando la entidad A, luego la B lo reutiliza.

-- 1) Entidad A: ordenes_compra (OP) -> ordenes_pago (libera "ordenes_compra")
ALTER TABLE "ordenes_compra" RENAME TO "ordenes_pago";
ALTER TABLE "historial_estado_oc" RENAME TO "historial_estado_op";
ALTER TYPE "estado_oc" RENAME TO "estado_op";

-- 2) Entidad B: solicitudes_compra -> ordenes_compra (reutiliza lo liberado)
ALTER TABLE "solicitudes_compra" RENAME TO "ordenes_compra";
ALTER TABLE "historial_estado_solicitud_compra" RENAME TO "historial_estado_oc";
ALTER TYPE "estado_solicitud_compra" RENAME TO "estado_oc";

-- 3) Columnas FK que cambian de nombre por el swap
ALTER TABLE "ordenes_pago" RENAME COLUMN "solicitud_compra_id" TO "orden_compra_id";
ALTER TABLE "comentarios" RENAME COLUMN "orden_compra_id" TO "orden_pago_id";
ALTER TABLE "historial_estado_op" RENAME COLUMN "orden_compra_id" TO "orden_pago_id";
ALTER TABLE "historial_estado_oc" RENAME COLUMN "solicitud_compra_id" TO "orden_compra_id";
