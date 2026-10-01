import { EstadoSolicitudCompra } from '../../../generated/prisma/enums';

export const TRANSICIONES_VALIDAS_SOLICITUD_COMPRA: Record<
  EstadoSolicitudCompra,
  EstadoSolicitudCompra[]
> = {
  [EstadoSolicitudCompra.BORRADOR]: [
    EstadoSolicitudCompra.PENDIENTE,
    EstadoSolicitudCompra.ANULADO,
  ],
  [EstadoSolicitudCompra.PENDIENTE]: [
    EstadoSolicitudCompra.APROBADO,
    EstadoSolicitudCompra.RECHAZADO,
    EstadoSolicitudCompra.ANULADO,
  ],
  [EstadoSolicitudCompra.APROBADO]: [EstadoSolicitudCompra.ANULADO],
  [EstadoSolicitudCompra.RECHAZADO]: [],
  [EstadoSolicitudCompra.ANULADO]: [],
};
