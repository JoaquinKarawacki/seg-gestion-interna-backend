import { Prisma } from '../../../generated/prisma/client';
import {
  CategoriaOrdenCompra,
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

// OC con las relaciones que necesita el mail de notificación (cuerpo completo).
// `proyecto` puede venir null (categorías sin proyecto).
export type OrdenCompraDetalle = Prisma.OrdenCompraGetPayload<{
  include: {
    proyecto: { include: { cliente: true } };
    proveedor: true;
    sector: true;
    solicitante: true;
  };
}>;

// OC con las relaciones que necesita el Excel de exportación. `proyecto` puede
// venir null (categorías sin proyecto); en ese caso la fila muestra "No asignado".
export type OrdenCompraExportable = Prisma.OrdenCompraGetPayload<{
  include: {
    proyecto: { include: { cliente: true } };
    proveedor: true;
    sector: true;
  };
}>;

// Datos para crear una OC junto con su Cotización (1:1), en una sola
// transacción. `proyectoId`/`clienteId` solo vienen en las categorías con
// proyecto (ESCO); en el resto son null. `archivoPdfRuta` puede faltar (el PDF
// es obligatorio solo si el monto sin IVA >= 1000 USD, validado en el service).
export interface DatosCrearOrdenCompra {
  categoria: CategoriaOrdenCompra;
  tipo: TipoOC;
  solicitanteId: string;
  sectorId: string;
  proveedorId: string;
  clienteId: string | null;
  proyectoId: string | null;
  moneda: Moneda;
  monto: Prisma.Decimal;
  concepto: string;
  pagaIva: boolean;
  ivaIncluido: boolean;
  observaciones: string | null;
  archivoPdfRuta: string | null;
  esPagoUnico: boolean;
  pagoUnicoFormaPago: FormaPago | null;
}

// Campos editables de una OC aprobada (categoría, proyecto, cliente, cotización y
// sector quedan fijos: definen la estructura y el circuito de aprobación).
export interface DatosModificarOrdenCompra {
  tipo: TipoOC;
  proveedorId: string;
  moneda: Moneda;
  monto: Prisma.Decimal;
  concepto: string;
  pagaIva: boolean;
  ivaIncluido: boolean;
  observaciones: string | null;
}

// Resultado de editar y reenviar a aprobación. El repositorio no lanza
// excepciones HTTP: comunica el motivo y el service decide el código.
export type ResultadoModificarReaprobar =
  | { estado: 'OK'; orden: OrdenCompraModel }
  | { estado: 'TIENE_ORDENES_PAGO' }
  | { estado: 'CONFLICTO_ESTADO' };

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
  buscarDetalle(id: string): Promise<OrdenCompraDetalle | null>;
  crearConCotizacion(datos: DatosCrearOrdenCompra): Promise<OrdenCompraModel>;
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
  // Todas las OC salvo las que no representan una compra vigente (borradores sin
  // enviar y anuladas). Trae las relaciones necesarias para el Excel.
  buscarParaExportar(): Promise<OrdenCompraExportable[]>;
  // Edita una OC aprobada y la reenvía a aprobación (APROBADO -> PENDIENTE), todo
  // en una transacción: bloquea si tiene OPs vivas y usa compare-and-swap sobre el
  // estado para evitar condiciones de carrera.
  modificarYReaprobar(
    id: string,
    datos: DatosModificarOrdenCompra,
    usuarioId: string,
  ): Promise<ResultadoModificarReaprobar>;
}
