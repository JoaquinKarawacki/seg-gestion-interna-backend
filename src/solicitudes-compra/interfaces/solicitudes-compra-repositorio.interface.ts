import { Prisma } from '../../../generated/prisma/client';
import {
  EstadoSolicitudCompra,
  Moneda,
  TipoOC,
} from '../../../generated/prisma/enums';
import {
  HistorialEstadoSolicitudCompraModel,
  SolicitudCompraModel,
} from '../../../generated/prisma/models';

export const SOLICITUDES_COMPRA_REPOSITORIO = Symbol(
  'ISolicitudesCompraRepositorio',
);

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
}

export interface FiltrosSolicitudCompra {
  proyectoId?: string;
  estado?: EstadoSolicitudCompra;
  sectorId?: string | string[];
  solicitanteId?: string;
}

export interface PaginacionSolicitudCompra {
  pagina: number;
  porPagina: number;
}

export interface ISolicitudesCompraRepositorio {
  buscarPorId(id: string): Promise<SolicitudCompraModel | null>;
  crearConCotizacionYTarea(
    datos: DatosCrearSolicitudConCotizacion,
  ): Promise<SolicitudCompraModel>;
  cambiarEstado(
    id: string,
    estadoAnterior: EstadoSolicitudCompra,
    estadoNuevo: EstadoSolicitudCompra,
    usuarioId: string,
    motivo?: string | null,
  ): Promise<SolicitudCompraModel | null>;
  buscarHistorial(
    solicitudCompraId: string,
  ): Promise<HistorialEstadoSolicitudCompraModel[]>;
  eliminar(id: string): Promise<void>;
  buscarConFiltros(
    filtros: FiltrosSolicitudCompra,
    paginacion: PaginacionSolicitudCompra,
  ): Promise<SolicitudCompraModel[]>;
  contarConFiltros(filtros: FiltrosSolicitudCompra): Promise<number>;
}
