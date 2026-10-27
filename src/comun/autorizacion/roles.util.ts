import { RolUsuario } from '../../../generated/prisma/enums';

interface ConRoles {
  roles: RolUsuario[];
}

export function tieneRol(usuario: ConRoles, rol: RolUsuario): boolean {
  return usuario.roles.includes(rol);
}

export function tieneAlgunRol(usuario: ConRoles, roles: RolUsuario[]): boolean {
  return roles.some((rol) => usuario.roles.includes(rol));
}
