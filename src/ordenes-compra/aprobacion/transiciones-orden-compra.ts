import { EstadoOC } from '../../../generated/prisma/enums';

export const TRANSICIONES_VALIDAS_ORDEN_COMPRA: Record<EstadoOC, EstadoOC[]> = {
  [EstadoOC.BORRADOR]: [EstadoOC.PENDIENTE, EstadoOC.ANULADO],
  [EstadoOC.PENDIENTE]: [
    EstadoOC.APROBADO,
    EstadoOC.RECHAZADO,
    EstadoOC.ANULADO,
  ],
  [EstadoOC.APROBADO]: [EstadoOC.ANULADO],
  [EstadoOC.RECHAZADO]: [],
  [EstadoOC.ANULADO]: [],
};
