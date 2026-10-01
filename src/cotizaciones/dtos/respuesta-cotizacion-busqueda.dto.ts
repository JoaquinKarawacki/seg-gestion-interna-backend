import { EstadoCotizacion, Moneda } from '../../../generated/prisma/enums';

// Cotización enriquecida para la pantalla de búsqueda/reutilización.
export class RespuestaCotizacionBusquedaDto {
  id!: string;
  proyectoId!: string;
  proyectoNombre!: string;
  proveedorId!: string;
  proveedorNombre!: string;
  tareaId!: string;
  rubroNombre!: string;
  montoTotal!: string;
  moneda!: Moneda;
  ivaIncluido!: boolean;
  estado!: EstadoCotizacion;
  archivoPdfRuta!: string | null;
  creadoEn!: Date;
}
