import { CotizacionModel } from '../../../generated/prisma/models';

export const COTIZACIONES_REPOSITORIO = Symbol('ICotizacionesRepositorio');

// Cotización con los nombres de sus relaciones resueltos, para la búsqueda
// global reutilizable (evita un N+1 de mapas en el frontend). `proyecto` puede
// ser null (cotizaciones de OC de categoría sin proyecto).
export interface CotizacionConRelaciones extends CotizacionModel {
  proyecto: { nombre: string } | null;
  proveedor: { nombre: string };
}

// Cotizacion es un registro inmutable: no se edita ni se borra directamente
// (nace y muere junto con su Orden de Compra). Por eso esta interfaz NO extiende
// IRepositorioBase.
export interface ICotizacionesRepositorio {
  buscarPorId(id: string): Promise<CotizacionModel | null>;
  buscarPorProyecto(proyectoId: string): Promise<CotizacionModel[]>;
  buscarTodasParaBusqueda(): Promise<CotizacionConRelaciones[]>;
}
