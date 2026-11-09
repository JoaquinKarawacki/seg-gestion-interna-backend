import { EstadoOP } from '../../../generated/prisma/enums';
import type { OrdenPagoModel } from '../../../generated/prisma/models';
import type { EventoOrdenPagoEstadoCambiado } from './orden-pago-estado-cambiado.evento';

// Arma el evento de cambio de estado a partir de la OP ya actualizada. Lo usan
// tanto las transiciones de aprobación como la edición con reaprobación, para que
// el payload que dispara las notificaciones sea siempre el mismo.
export function construirEventoOrdenPagoEstadoCambiado(
  orden: OrdenPagoModel,
  estadoAnterior: EstadoOP,
  usuarioId: string,
  motivo?: string | null,
): EventoOrdenPagoEstadoCambiado {
  return {
    ordenPagoId: orden.id,
    numero: orden.numero,
    estadoAnterior,
    estadoNuevo: orden.estado,
    sectorId: orden.sectorId,
    solicitanteId: orden.solicitanteId,
    usuarioId,
    motivo: motivo ?? null,
    monto: orden.monto.toString(),
    moneda: orden.moneda,
    concepto: orden.concepto,
  };
}
