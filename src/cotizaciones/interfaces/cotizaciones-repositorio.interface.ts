import { Prisma } from '../../../generated/prisma/client';
import { Moneda } from '../../../generated/prisma/enums';
import { CotizacionModel } from '../../../generated/prisma/models';

export const COTIZACIONES_REPOSITORIO = Symbol('ICotizacionesRepositorio');

export interface DatosCrearCotizacion {
  proyectoId: string;
  proveedorId: string;
  montoTotal: Prisma.Decimal;
  moneda: Moneda;
  archivoPdfRuta?: string | null;
}

// Cotizacion es un registro versionado e inmutable: no se edita ni se
// borra, solo se reemplaza creando una version nueva. Por eso esta
// interfaz NO extiende IRepositorioBase (no tiene sentido un
// actualizar/eliminar genericos aca).
export interface ICotizacionesRepositorio {
  buscarPorId(id: string): Promise<CotizacionModel | null>;
  buscarPorProyecto(proyectoId: string): Promise<CotizacionModel[]>;
  buscarActivaPorProyecto(proyectoId: string): Promise<CotizacionModel | null>;
  crearNuevaVersion(datos: DatosCrearCotizacion): Promise<CotizacionModel>;
}
