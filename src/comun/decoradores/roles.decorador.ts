import { SetMetadata } from '@nestjs/common';
import { RolUsuario } from '../../../generated/prisma/enums';

export const ROLES_METADATA_CLAVE = 'roles';

export const Roles = (...roles: RolUsuario[]) =>
  SetMetadata(ROLES_METADATA_CLAVE, roles);
