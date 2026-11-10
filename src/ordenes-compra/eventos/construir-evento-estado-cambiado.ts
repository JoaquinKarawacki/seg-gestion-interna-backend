import { EstadoOC } from '../../../generated/prisma/enums';
import type { OrdenCompraModel } from '../../../generated/prisma/models';
import type { EventoOrdenCompraEstadoCambiado } from './orden-compra-estado-cambiado.evento';

// Arma el evento de cambio de estado a partir de la OC ya actualizada. Lo usan
// tanto las transiciones de aprobación como la edición con reaprobación, para que
// el payload que dispara las notificaciones sea siempre el mismo.
export function construirEventoOrdenCompraEstadoCambiado(
  solicitud: OrdenCompraModel,
  estadoAnterior: EstadoOC,
  usuarioId: string,
  motivo?: string | null,
): EventoOrdenCompraEstadoCambiado {
  return {
    ordenCompraId: solicitud.id,
    numero: solicitud.numero,
    estadoAnterior,
    estadoNuevo: solicitud.estado,
    sectorId: solicitud.sectorId,
    solicitanteId: solicitud.solicitanteId,
    usuarioId,
    motivo: motivo ?? null,
    monto: solicitud.monto.toString(),
    moneda: solicitud.moneda,
    concepto: solicitud.concepto,
  };
}
