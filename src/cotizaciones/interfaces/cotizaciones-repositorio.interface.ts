import { CotizacionModel } from '../../../generated/prisma/models';

export const COTIZACIONES_REPOSITORIO = Symbol('ICotizacionesRepositorio');

// Cotización con los nombres de sus relaciones resueltos, para la búsqueda
// global reutilizable (evita un N+1 de mapas en el frontend).
export interface CotizacionConRelaciones extends CotizacionModel {
  proyecto: { nombre: string };
  proveedor: { nombre: string };
  tarea: { nombre: string };
}

// Cotizacion es un registro versionado e inmutable: no se edita ni se borra
// directamente (nace y muere junto con su Orden de Compra). Por eso esta
// interfaz NO extiende IRepositorioBase.
export interface ICotizacionesRepositorio {
  buscarPorId(id: string): Promise<CotizacionModel | null>;
  buscarPorProyecto(proyectoId: string): Promise<CotizacionModel[]>;
  buscarPorTarea(tareaId: string): Promise<CotizacionModel[]>;
  buscarActivaPorTarea(tareaId: string): Promise<CotizacionModel | null>;
  buscarTodasParaBusqueda(): Promise<CotizacionConRelaciones[]>;
}
