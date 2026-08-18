import { Prisma } from '../../../generated/prisma/client';
import {
  EstadoOC,
  FormaPago,
  Moneda,
  TipoOC,
} from '../../../generated/prisma/enums';
import {
  HistorialEstadoOCModel,
  OrdenCompraModel,
} from '../../../generated/prisma/models';
import { IRepositorioBase } from '../../comun/interfaces/repositorio-base.interface';

export const ORDENES_COMPRA_REPOSITORIO = Symbol('IOrdenesCompraRepositorio');

export interface DatosCrearOrdenCompra {
  tipo: TipoOC;
  fecha: Date;
  solicitanteId: string;
  sectorId: string;
  proveedorId: string;
  clienteId: string | null;
  proyectoId: string | null;
  tareaId: string | null;
  cotizacionId: string | null;
  moneda: Moneda;
  monto: Prisma.Decimal;
  concepto: string;
  formaPago: FormaPago;
  pagaIva: boolean;
  ivaIncluido: boolean;
  observaciones?: string | null;
  facturaPdfRuta?: string | null;
}

export interface DatosActualizarOrdenCompra {
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

export interface FiltrosOrdenCompra {
  proyectoId?: string;
  cotizacionId?: string;
  estado?: EstadoOC;
  sectorId?: string;
  solicitanteId?: string;
}

export interface PaginacionOrdenCompra {
  pagina: number;
  porPagina: number;
}

export interface IOrdenesCompraRepositorio extends IRepositorioBase<
  OrdenCompraModel,
  DatosCrearOrdenCompra,
  DatosActualizarOrdenCompra
> {
  sumarMontoPorCotizacion(cotizacionId: string): Promise<Prisma.Decimal>;
  cambiarEstado(
    id: string,
    estadoNuevo: EstadoOC,
    usuarioId: string,
    motivo?: string | null,
  ): Promise<OrdenCompraModel>;
  buscarHistorial(ordenCompraId: string): Promise<HistorialEstadoOCModel[]>;
  contarComentariosAsociados(ordenCompraId: string): Promise<number>;
  buscarConFiltros(
    filtros: FiltrosOrdenCompra,
    paginacion: PaginacionOrdenCompra,
  ): Promise<OrdenCompraModel[]>;
  contarConFiltros(filtros: FiltrosOrdenCompra): Promise<number>;
}
