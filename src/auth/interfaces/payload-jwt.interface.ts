import { RolUsuario } from '../../../generated/prisma/enums';

export interface PayloadJwt {
  sub: string;
  email: string;
  roles: RolUsuario[];
  sectorId: string | null;
  sectoresEncargado: string[];
}
