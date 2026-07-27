import { UsuarioModel } from '../../../generated/prisma/models';

export const USUARIOS_REPOSITORIO = Symbol('IUsuariosRepositorio');

export interface IUsuariosRepositorio {
  buscarPorId(id: string): Promise<UsuarioModel | null>;
  buscarPorEmail(email: string): Promise<UsuarioModel | null>;
}
