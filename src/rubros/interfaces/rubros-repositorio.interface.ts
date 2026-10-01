import { RubroModel } from '../../../generated/prisma/models';
import { IRepositorioBase } from '../../comun/interfaces/repositorio-base.interface';

export const RUBROS_REPOSITORIO = Symbol('IRubrosRepositorio');

export interface DatosCrearRubro {
  nombre: string;
}

export interface DatosActualizarRubro {
  nombre?: string;
  activo?: boolean;
}

export interface IRubrosRepositorio extends IRepositorioBase<
  RubroModel,
  DatosCrearRubro,
  DatosActualizarRubro
> {
  buscarPorNombre(nombre: string): Promise<RubroModel | null>;
  contarSolicitudesAsociadas(rubroId: string): Promise<number>;
}
