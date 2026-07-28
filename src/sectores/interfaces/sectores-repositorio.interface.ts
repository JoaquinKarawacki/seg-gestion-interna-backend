import { SectorModel } from '../../../generated/prisma/models';
import { IRepositorioBase } from '../../comun/interfaces/repositorio-base.interface';

export const SECTORES_REPOSITORIO = Symbol('ISectoresRepositorio');

export interface DatosCrearSector {
  nombre: string;
}

export interface DatosActualizarSector {
  nombre?: string;
}

export interface ISectoresRepositorio extends IRepositorioBase<
  SectorModel,
  DatosCrearSector,
  DatosActualizarSector
> {
  contarUsuariosAsignados(sectorId: string): Promise<number>;
}
