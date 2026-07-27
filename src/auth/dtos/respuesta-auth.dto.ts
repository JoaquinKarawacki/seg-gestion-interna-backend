import { RolUsuario } from '../../../generated/prisma/enums';

export class UsuarioAutenticadoDto {
  id!: string;
  nombre!: string;
  email!: string;
  rol!: RolUsuario;
}

export class RespuestaAuthDto {
  token!: string;
  usuario!: UsuarioAutenticadoDto;
}
