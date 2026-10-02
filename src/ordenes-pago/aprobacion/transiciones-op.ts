import { EstadoOP } from '../../../generated/prisma/enums';

export const TRANSICIONES_VALIDAS_OP: Record<EstadoOP, EstadoOP[]> = {
  [EstadoOP.BORRADOR]: [EstadoOP.PENDIENTE, EstadoOP.ANULADO],
  [EstadoOP.PENDIENTE]: [
    EstadoOP.EN_CONSULTA,
    EstadoOP.APROBADO,
    EstadoOP.RECHAZADO,
    EstadoOP.ANULADO,
  ],
  [EstadoOP.EN_CONSULTA]: [EstadoOP.PENDIENTE, EstadoOP.ANULADO],
  [EstadoOP.APROBADO]: [
    EstadoOP.PAGO_OBSERVADO,
    EstadoOP.PAGADO,
    EstadoOP.ANULADO,
  ],
  [EstadoOP.RECHAZADO]: [],
  [EstadoOP.PAGO_OBSERVADO]: [EstadoOP.APROBADO, EstadoOP.ANULADO],
  [EstadoOP.PAGADO]: [],
  [EstadoOP.ANULADO]: [],
};
