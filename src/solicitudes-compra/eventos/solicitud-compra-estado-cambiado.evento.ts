import { EstadoSolicitudCompra } from '../../../generated/prisma/enums';

export interface EventoSolicitudCompraEstadoCambiado {
  solicitudCompraId: string;
  numero: number;
  estadoAnterior: EstadoSolicitudCompra;
  estadoNuevo: EstadoSolicitudCompra;
  sectorId: string;
  solicitanteId: string;
  usuarioId: string;
  motivo: string | null;
}
