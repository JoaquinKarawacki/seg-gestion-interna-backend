import { EstadoSolicitudCompra } from '../../../../generated/prisma/enums';

export class RespuestaHistorialSolicitudCompraDto {
  id!: string;
  estadoAnterior!: EstadoSolicitudCompra;
  estadoNuevo!: EstadoSolicitudCompra;
  usuarioId!: string;
  motivo!: string | null;
  creadoEn!: Date;
}
