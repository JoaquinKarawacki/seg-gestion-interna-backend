import { RolUsuario } from '../../../generated/prisma/enums';
import { UsuarioModel } from '../../../generated/prisma/models';
import { IRepositorioBase } from '../../comun/interfaces/repositorio-base.interface';

export const USUARIOS_REPOSITORIO = Symbol('IUsuariosRepositorio');

export interface DatosCrearUsuario {
  nombre: string;
  email: string;
  contrasenaHash: string;
  rol: RolUsuario;
  sectorId?: string | null;
}

export interface DatosActualizarUsuario {
  nombre?: string;
  email?: string;
  rol?: RolUsuario;
  sectorId?: string | null;
  activo?: boolean;
  contrasenaHash?: string;
}

export interface IUsuariosRepositorio extends IRepositorioBase<
  UsuarioModel,
  DatosCrearUsuario,
  DatosActualizarUsuario
> {
  buscarPorEmail(email: string): Promise<UsuarioModel | null>;
  buscarActivosPorRol(
    rol: RolUsuario,
    sectorId?: string,
  ): Promise<UsuarioModel[]>;
}
