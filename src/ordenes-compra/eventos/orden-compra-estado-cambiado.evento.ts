import { EstadoOC } from '../../../generated/prisma/enums';

export interface EventoOrdenCompraEstadoCambiado {
  ordenCompraId: string;
  numero: number;
  estadoAnterior: EstadoOC;
  estadoNuevo: EstadoOC;
  sectorId: string;
  solicitanteId: string;
  usuarioId: string;
  motivo: string | null;
}
