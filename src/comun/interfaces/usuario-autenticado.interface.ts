import { RolUsuario } from '../../../generated/prisma/enums';

export interface UsuarioAutenticado {
  id: string;
  email: string;
  rol: RolUsuario;
  sectorId: string | null;
}
