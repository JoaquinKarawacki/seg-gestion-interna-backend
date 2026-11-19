import { Prisma } from '../../../generated/prisma/client';
import { CotizacionModel } from '../../../generated/prisma/models';

export const COTIZACIONES_REPOSITORIO = Symbol('ICotizacionesRepositorio');

// Cotización con los nombres de sus relaciones resueltos, para la búsqueda
// global reutilizable (evita un N+1 de mapas en el frontend). `proyecto` puede
// ser null (cotizaciones de OC de categoría sin proyecto).
export interface CotizacionConRelaciones extends CotizacionModel {
  proyecto: { nombre: string } | null;
  proveedor: { nombre: string };
}

// Cotización con lo que necesita el Excel del listado: proyecto + cliente,
// proveedor, la OC de origen (con su sector) y los montos de sus OP no anuladas
// (para calcular lo comprometido y el saldo).
export type CotizacionExportable = Prisma.CotizacionGetPayload<{
  include: {
    proyecto: { include: { cliente: true } };
    proveedor: true;
    ordenCompra: { include: { sector: true } };
    ordenesPago: { select: { monto: true } };
  };
}>;

// Cotizacion es un registro inmutable: no se edita ni se borra directamente
// (nace y muere junto con su Orden de Compra). Por eso esta interfaz NO extiende
// IRepositorioBase.
export interface ICotizacionesRepositorio {
  buscarPorId(id: string): Promise<CotizacionModel | null>;
  buscarPorProyecto(proyectoId: string): Promise<CotizacionModel[]>;
  buscarTodasParaBusqueda(): Promise<CotizacionConRelaciones[]>;
  buscarParaExportar(): Promise<CotizacionExportable[]>;
}
