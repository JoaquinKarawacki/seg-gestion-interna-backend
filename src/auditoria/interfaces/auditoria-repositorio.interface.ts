import { AuditoriaModel } from '../../../generated/prisma/models';

export const AUDITORIA_REPOSITORIO = Symbol('IAuditoriaRepositorio');

export interface DatosCrearAuditoria {
  usuarioId: string;
  usuarioEmail: string;
  accion: string;
  descripcion: string;
  entidad?: string;
  entidadId?: string;
}

export interface FiltrosAuditoria {
  accion?: string;
  entidad?: string;
  usuarioEmail?: string;
}

export interface PaginacionAuditoria {
  pagina: number;
  porPagina: number;
}

export interface IAuditoriaRepositorio {
  crear(datos: DatosCrearAuditoria): Promise<AuditoriaModel>;
  buscarConFiltros(
    filtros: FiltrosAuditoria,
    paginacion: PaginacionAuditoria,
  ): Promise<AuditoriaModel[]>;
  contarConFiltros(filtros: FiltrosAuditoria): Promise<number>;
}
