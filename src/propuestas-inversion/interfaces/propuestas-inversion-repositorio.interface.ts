import { Prisma } from '../../../generated/prisma/client';
import { Moneda } from '../../../generated/prisma/enums';
import { PropuestaInversionModel } from '../../../generated/prisma/models';

export const PROPUESTAS_INVERSION_REPOSITORIO = Symbol(
  'IPropuestasInversionRepositorio',
);

export interface DatosCrearPropuestaInversion {
  proyectoId: string;
  costoTotalAproximado: Prisma.Decimal;
  ahorroMensual: Prisma.Decimal;
  cantidadMeses: number;
  porcentajeSeg: Prisma.Decimal;
  moneda: Moneda;
  archivoRuta?: string | null;
  archivoMimeType?: string | null;
  archivoNombreOriginal?: string | null;
}

// PropuestaInversion es un registro versionado e inmutable: no se edita ni
// se borra, solo se reemplaza creando una version nueva. Por eso esta
// interfaz NO extiende IRepositorioBase (mismo criterio que Cotizacion).
export interface IPropuestasInversionRepositorio {
  buscarPorId(id: string): Promise<PropuestaInversionModel | null>;
  buscarPorProyecto(proyectoId: string): Promise<PropuestaInversionModel[]>;
  buscarActivaPorProyecto(
    proyectoId: string,
  ): Promise<PropuestaInversionModel | null>;
  crearNuevaVersion(
    datos: DatosCrearPropuestaInversion,
  ): Promise<PropuestaInversionModel>;
}
