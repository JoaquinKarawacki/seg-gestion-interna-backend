import { EstadoOC } from '../../../generated/prisma/enums';

export const TRANSICIONES_VALIDAS_ORDEN_COMPRA: Record<EstadoOC, EstadoOC[]> = {
  [EstadoOC.BORRADOR]: [EstadoOC.PENDIENTE, EstadoOC.ANULADO],
  [EstadoOC.PENDIENTE]: [
    EstadoOC.APROBADO,
    EstadoOC.RECHAZADO,
    EstadoOC.ANULADO,
  ],
  // PENDIENTE: una OC aprobada puede editarse y volver a aprobación (siempre que
  // no tenga órdenes de pago vivas; eso lo valida el service).
  [EstadoOC.APROBADO]: [EstadoOC.ANULADO, EstadoOC.PENDIENTE],
  [EstadoOC.RECHAZADO]: [],
  [EstadoOC.ANULADO]: [],
};
