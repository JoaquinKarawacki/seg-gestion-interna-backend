import { TareaModel } from '../../../generated/prisma/models';
import { IRepositorioBase } from '../../comun/interfaces/repositorio-base.interface';

export const TAREAS_REPOSITORIO = Symbol('ITareasRepositorio');

export interface DatosCrearTarea {
  nombre: string;
  proyectoId: string;
}

export interface DatosActualizarTarea {
  nombre?: string;
}

export interface ITareasRepositorio extends IRepositorioBase<
  TareaModel,
  DatosCrearTarea,
  DatosActualizarTarea
> {
  buscarPorProyecto(proyectoId: string): Promise<TareaModel[]>;
  contarCotizacionesAsociadas(tareaId: string): Promise<number>;
  contarOrdenesCompraAsociadas(tareaId: string): Promise<number>;
}
