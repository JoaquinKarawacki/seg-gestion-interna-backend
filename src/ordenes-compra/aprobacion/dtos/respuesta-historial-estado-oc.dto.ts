import { EstadoOC } from '../../../../generated/prisma/enums';

export class RespuestaHistorialEstadoOCDto {
  id!: string;
  estadoAnterior!: EstadoOC;
  estadoNuevo!: EstadoOC;
  usuarioId!: string;
  motivo!: string | null;
  creadoEn!: Date;
}
