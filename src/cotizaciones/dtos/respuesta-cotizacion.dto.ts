import { EstadoCotizacion, Moneda } from '../../../generated/prisma/enums';

export class RespuestaCotizacionDto {
  id!: string;
  proyectoId!: string;
  tareaId!: string;
  proveedorId!: string;
  montoTotal!: string;
  moneda!: Moneda;
  estado!: EstadoCotizacion;
  archivoPdfRuta!: string | null;
}
