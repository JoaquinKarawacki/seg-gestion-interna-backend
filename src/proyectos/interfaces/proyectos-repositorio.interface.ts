import { ProyectoModel } from '../../../generated/prisma/models';
import { IRepositorioBase } from '../../comun/interfaces/repositorio-base.interface';

export const PROYECTOS_REPOSITORIO = Symbol('IProyectosRepositorio');

export interface DatosCrearProyecto {
  nombre: string;
  clienteId: string;
  sectorId?: string;
}

export interface DatosActualizarProyecto {
  nombre?: string;
  clienteId?: string;
  sectorId?: string;
  // `| null` solo lo usa internamente ProyectosService.recalcularCostoSeg()
  // para limpiar el override — el DTO público nunca manda null explícito.
  costoSegManual?: number | null;
}

export interface IProyectosRepositorio extends IRepositorioBase<
  ProyectoModel,
  DatosCrearProyecto,
  DatosActualizarProyecto
> {
  contarCotizacionesAsociadas(proyectoId: string): Promise<number>;
  contarTareasAsociadas(proyectoId: string): Promise<number>;
  contarOrdenesCompraAsociadas(proyectoId: string): Promise<number>;
}
