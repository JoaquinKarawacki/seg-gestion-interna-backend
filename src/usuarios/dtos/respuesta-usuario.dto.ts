import { RolUsuario } from '../../../generated/prisma/enums';

export class RespuestaUsuarioDto {
  id!: string;
  nombre!: string;
  email!: string;
  rol!: RolUsuario;
  activo!: boolean;
  sectorId!: string | null;
}
