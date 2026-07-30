import { EstadoOC } from '../../../generated/prisma/enums';

export const TRANSICIONES_VALIDAS_OC: Record<EstadoOC, EstadoOC[]> = {
  [EstadoOC.BORRADOR]: [EstadoOC.PENDIENTE, EstadoOC.ANULADO],
  [EstadoOC.PENDIENTE]: [
    EstadoOC.EN_CONSULTA,
    EstadoOC.APROBADO,
    EstadoOC.RECHAZADO,
    EstadoOC.ANULADO,
  ],
  [EstadoOC.EN_CONSULTA]: [EstadoOC.PENDIENTE, EstadoOC.ANULADO],
  [EstadoOC.APROBADO]: [
    EstadoOC.PAGO_OBSERVADO,
    EstadoOC.PAGADO,
    EstadoOC.ANULADO,
  ],
  [EstadoOC.RECHAZADO]: [],
  [EstadoOC.PAGO_OBSERVADO]: [EstadoOC.APROBADO, EstadoOC.ANULADO],
  [EstadoOC.PAGADO]: [],
  [EstadoOC.ANULADO]: [],
};
