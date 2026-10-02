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

export const ORDENES_COMPRA_REPOSITORIO = Symbol('IOrdenesCompraRepositorio');

// Datos para crear una OC junto con su Cotización (1:1) y su Tarea (reutilizada
// por rubro en el proyecto), todo en una sola transacción.
export interface DatosCrearSolicitudConCotizacion {
  tipo: TipoOC;
  solicitanteId: string;
  sectorId: string;
  proveedorId: string;
  clienteId: string | null;
  proyectoId: string;
  rubroId: string;
  rubroNombre: string;
  moneda: Moneda;
  monto: Prisma.Decimal;
  concepto: string;
  pagaIva: boolean;
  ivaIncluido: boolean;
  observaciones: string | null;
  archivoPdfRuta: string;
  esPagoUnico: boolean;
  pagoUnicoFormaPago: FormaPago | null;
}

export interface FiltrosOrdenCompra {
  proyectoId?: string;
  estado?: EstadoOC;
  sectorId?: string | string[];
  solicitanteId?: string;
}

export interface PaginacionOrdenCompra {
  pagina: number;
  porPagina: number;
}

export interface IOrdenesCompraRepositorio {
  buscarPorId(id: string): Promise<OrdenCompraModel | null>;
  crearConCotizacionYTarea(
    datos: DatosCrearSolicitudConCotizacion,
  ): Promise<OrdenCompraModel>;
  cambiarEstado(
    id: string,
    estadoAnterior: EstadoOC,
    estadoNuevo: EstadoOC,
    usuarioId: string,
    motivo?: string | null,
  ): Promise<OrdenCompraModel | null>;
  buscarHistorial(ordenCompraId: string): Promise<HistorialEstadoOCModel[]>;
  eliminar(id: string): Promise<void>;
  buscarConFiltros(
    filtros: FiltrosOrdenCompra,
    paginacion: PaginacionOrdenCompra,
  ): Promise<OrdenCompraModel[]>;
  contarConFiltros(filtros: FiltrosOrdenCompra): Promise<number>;
}
