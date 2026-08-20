import { EstadoCotizacion, Moneda } from '../../../generated/prisma/enums';

export class RespuestaPropuestaInversionDto {
  id!: string;
  proyectoId!: string;
  costoTotalAproximado!: string;
  ahorroMensual!: string;
  cantidadMeses!: number;
  porcentajeSeg!: string;
  honorarios!: string;
  moneda!: Moneda;
  estado!: EstadoCotizacion;
  archivoRuta!: string | null;
  archivoMimeType!: string | null;
  archivoNombreOriginal!: string | null;
}
