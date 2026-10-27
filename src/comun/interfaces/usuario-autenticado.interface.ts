import { RolUsuario } from '../../../generated/prisma/enums';

export interface UsuarioAutenticado {
  id: string;
  email: string;
  roles: RolUsuario[];
  sectorId: string | null;
  sectoresEncargado: string[];
}
