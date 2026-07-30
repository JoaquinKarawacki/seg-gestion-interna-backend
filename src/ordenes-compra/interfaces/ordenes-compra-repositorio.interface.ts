import { Prisma } from '../../../generated/prisma/client';
import { FormaPago, Moneda, TipoOC } from '../../../generated/prisma/enums';
import { OrdenCompraModel } from '../../../generated/prisma/models';
import { IRepositorioBase } from '../../comun/interfaces/repositorio-base.interface';

export const ORDENES_COMPRA_REPOSITORIO = Symbol('IOrdenesCompraRepositorio');

export interface DatosCrearOrdenCompra {
  tipo: TipoOC;
  fecha: Date;
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

export interface IOrdenesCompraRepositorio extends IRepositorioBase<
  OrdenCompraModel,
  DatosCrearOrdenCompra,
  DatosActualizarOrdenCompra
> {
  sumarMontoPorCotizacion(cotizacionId: string): Promise<Prisma.Decimal>;
}
