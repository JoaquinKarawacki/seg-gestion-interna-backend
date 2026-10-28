import { Prisma } from '../../../generated/prisma/client';
import {
  EstadoOP,
  FormaPago,
  Moneda,
  TipoOC,
} from '../../../generated/prisma/enums';
import {
  HistorialEstadoOPModel,
  OrdenPagoModel,
} from '../../../generated/prisma/models';
import { IRepositorioBase } from '../../comun/interfaces/repositorio-base.interface';

export const ORDENES_PAGO_REPOSITORIO = Symbol('IOrdenesPagoRepositorio');

// OP con las relaciones que necesita el mail de notificación (cuerpo completo).
// El proyecto es opcional (puede faltar en OPs viejas sin OC de origen).
export type OrdenPagoDetalle = Prisma.OrdenPagoGetPayload<{
  include: {
    proyecto: { include: { cliente: true } };
    proveedor: true;
    sector: true;
    solicitante: true;
    ordenCompra: true;
  };
}>;

// OP aprobada con todo lo que necesita el Excel de pagos a ejecutar: proveedor
// (con datos bancarios), proyecto + cliente, sector, solicitante, la OC de
// origen y el historial con su usuario (para saber quién la aprobó).
export type OrdenPagoParaPago = Prisma.OrdenPagoGetPayload<{
  include: {
    proveedor: true;
    sector: true;
    solicitante: true;
    proyecto: { include: { cliente: true } };
    ordenCompra: true;
    historialEstados: { include: { usuario: true } };
  };
}>;

export interface DatosCrearOrdenPago {
  tipo: TipoOC;
  fecha: Date;
  solicitanteId: string;
  sectorId: string;
  proveedorId: string;
  clienteId: string | null;
  proyectoId: string | null;
  tareaId: string | null;
  cotizacionId: string | null;
  ordenCompraId?: string | null;
  moneda: Moneda;
  monto: Prisma.Decimal;
  concepto: string;
  formaPago: FormaPago;
  pagaIva: boolean;
  ivaIncluido: boolean;
  observaciones?: string | null;
  facturaPdfRuta?: string | null;
}

export interface DatosActualizarOrdenPago {
  tipo?: TipoOC;
  fecha?: Date;
  sectorId?: string;
  proveedorId?: string;
  moneda?: Moneda;
  concepto?: string;
  formaPago?: FormaPago;
  pagaIva?: boolean;
  ivaIncluido?: boolean;
  observaciones?: string | null;
  facturaPdfRuta?: string | null;
}

export interface FiltrosOrdenPago {
  proyectoId?: string;
  cotizacionId?: string;
  // OPs generadas desde una OC (OrdenCompra). Se usa para la idempotencia del
  // pago único: contar las OPs ya ligadas a una OC puntual.
  ordenCompraId?: string;
  estado?: EstadoOP;
  sectorId?: string | string[];
  solicitanteId?: string;
}

export interface PaginacionOrdenPago {
  pagina: number;
  porPagina: number;
}

export interface IOrdenesPagoRepositorio extends IRepositorioBase<
  OrdenPagoModel,
  DatosCrearOrdenPago,
  DatosActualizarOrdenPago
> {
  buscarDetalle(id: string): Promise<OrdenPagoDetalle | null>;
  buscarAprobadasParaPago(): Promise<OrdenPagoParaPago[]>;
  sumarMontoPorCotizacion(cotizacionId: string): Promise<Prisma.Decimal>;
  cambiarEstado(
    id: string,
    estadoAnterior: EstadoOP,
    estadoNuevo: EstadoOP,
    usuarioId: string,
    motivo?: string | null,
  ): Promise<OrdenPagoModel | null>;
  buscarHistorial(ordenPagoId: string): Promise<HistorialEstadoOPModel[]>;
  contarComentariosAsociados(ordenPagoId: string): Promise<number>;
  buscarConFiltros(
    filtros: FiltrosOrdenPago,
    paginacion: PaginacionOrdenPago,
  ): Promise<OrdenPagoModel[]>;
  contarConFiltros(filtros: FiltrosOrdenPago): Promise<number>;
}
