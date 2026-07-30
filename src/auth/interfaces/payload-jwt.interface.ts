import { RolUsuario } from '../../../generated/prisma/enums';

export interface PayloadJwt {
  sub: string;
  email: string;
  rol: RolUsuario;
  sectorId: string | null;
}
