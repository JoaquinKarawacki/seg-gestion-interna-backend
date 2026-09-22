import { RolUsuario } from '../../../generated/prisma/enums';
import { UsuarioModel } from '../../../generated/prisma/models';
import { IRepositorioBase } from '../../comun/interfaces/repositorio-base.interface';

export const USUARIOS_REPOSITORIO = Symbol('IUsuariosRepositorio');

export type UsuarioConSectoresEncargado = UsuarioModel & {
  sectoresEncargado: { id: string }[];
};

export interface DatosCrearUsuario {
  nombre: string;
  email: string;
  contrasenaHash: string;
  rol: RolUsuario;
  sectorId?: string | null;
  sectoresEncargadoIds?: string[];
}

export interface DatosActualizarUsuario {
  nombre?: string;
  email?: string;
  rol?: RolUsuario;
  sectorId?: string | null;
  activo?: boolean;
  contrasenaHash?: string;
  sectoresEncargadoIds?: string[];
}

export interface IUsuariosRepositorio extends IRepositorioBase<
  UsuarioConSectoresEncargado,
  DatosCrearUsuario,
  DatosActualizarUsuario
> {
  buscarPorEmail(email: string): Promise<UsuarioConSectoresEncargado | null>;
  buscarActivosPorRol(
    rol: RolUsuario,
    sectorId?: string,
  ): Promise<UsuarioModel[]>;
}
