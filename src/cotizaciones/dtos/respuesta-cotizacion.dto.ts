import { EstadoCotizacion, Moneda } from '../../../generated/prisma/enums';

export class RespuestaCotizacionDto {
  id!: string;
  proyectoId!: string;
  tareaId!: string | null;
  proveedorId!: string;
  montoTotal!: string;
  honorarios!: string | null;
  moneda!: Moneda;
  estado!: EstadoCotizacion;
  archivoPdfRuta!: string | null;
}
