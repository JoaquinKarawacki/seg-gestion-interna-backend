import { EstadoOP } from '../../../../generated/prisma/enums';

export class RespuestaHistorialEstadoOPDto {
  id!: string;
  estadoAnterior!: EstadoOP;
  estadoNuevo!: EstadoOP;
  usuarioId!: string;
  motivo!: string | null;
  creadoEn!: Date;
}
