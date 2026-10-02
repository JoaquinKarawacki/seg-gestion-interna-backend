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
