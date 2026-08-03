export class RespuestaAuditoriaDto {
  id: string;
  usuarioId: string;
  usuarioEmail: string;
  accion: string;
  descripcion: string;
  entidad: string | null;
  entidadId: string | null;
  creadoEn: Date;
}
