import { ProyectoModel } from '../../../generated/prisma/models';
import { IRepositorioBase } from '../../comun/interfaces/repositorio-base.interface';

export const PROYECTOS_REPOSITORIO = Symbol('IProyectosRepositorio');

export interface DatosCrearProyecto {
  nombre: string;
  clienteId: string;
}

export interface DatosActualizarProyecto {
  nombre?: string;
  clienteId?: string;
}

export interface IProyectosRepositorio extends IRepositorioBase<
  ProyectoModel,
  DatosCrearProyecto,
  DatosActualizarProyecto
> {
  contarCotizacionesAsociadas(proyectoId: string): Promise<number>;
}
