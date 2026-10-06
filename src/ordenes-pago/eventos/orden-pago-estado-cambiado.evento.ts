import { EstadoOP, Moneda } from '../../../generated/prisma/enums';

export interface EventoOrdenPagoEstadoCambiado {
  ordenPagoId: string;
  numero: number;
  estadoAnterior: EstadoOP;
  estadoNuevo: EstadoOP;
  sectorId: string;
  solicitanteId: string;
  usuarioId: string;
  motivo: string | null;
  monto: string;
  moneda: Moneda;
  concepto: string;
}
