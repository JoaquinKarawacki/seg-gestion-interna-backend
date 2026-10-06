import { EstadoOC, Moneda } from '../../../generated/prisma/enums';

export interface EventoOrdenCompraEstadoCambiado {
  ordenCompraId: string;
  numero: number;
  estadoAnterior: EstadoOC;
  estadoNuevo: EstadoOC;
  sectorId: string;
  solicitanteId: string;
  usuarioId: string;
  motivo: string | null;
  monto: string;
  moneda: Moneda;
  concepto: string;
}
