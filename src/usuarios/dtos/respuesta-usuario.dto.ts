import { RolUsuario } from '../../../generated/prisma/enums';

export class RespuestaUsuarioDto {
  id!: string;
  nombre!: string;
  email!: string;
  roles!: RolUsuario[];
  activo!: boolean;
  sectorId!: string | null;
  sectoresEncargadoIds!: string[];
}
