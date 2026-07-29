import { ClienteModel } from '../../../generated/prisma/models';
import { IRepositorioBase } from '../../comun/interfaces/repositorio-base.interface';

export const CLIENTES_REPOSITORIO = Symbol('IClientesRepositorio');

export interface DatosCrearCliente {
  nombre: string;
  rut: string;
  email?: string | null;
  telefono?: string | null;
}

export interface DatosActualizarCliente {
  nombre?: string;
  rut?: string;
  email?: string | null;
  telefono?: string | null;
}

export interface IClientesRepositorio extends IRepositorioBase<
  ClienteModel,
  DatosCrearCliente,
  DatosActualizarCliente
> {
  contarProyectosAsociados(clienteId: string): Promise<number>;
}
