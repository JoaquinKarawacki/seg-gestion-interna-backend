import {
  EstadoOP,
  FormaPago,
  Moneda,
  TipoOC,
} from '../../../generated/prisma/enums';

export class RespuestaOrdenPagoDto {
  id!: string;
  numero!: number;
  tipo!: TipoOC;
  fecha!: Date;
  solicitanteId!: string;
  sectorId!: string;
  proveedorId!: string;
  clienteId!: string | null;
  proyectoId!: string | null;
  cotizacionId!: string | null;
  ordenCompraId!: string | null;
  moneda!: Moneda;
  monto!: string;
  concepto!: string;
  formaPago!: FormaPago;
  pagaIva!: boolean;
  ivaIncluido!: boolean;
  observaciones!: string | null;
  facturaPdfRuta!: string | null;
  estado!: EstadoOP;
  // Solo en el detalle (GET /ordenes-pago/:id): quien aprobó la OC de origen y la
  // aprueba (null = regla del sector). Ver AprobadorOrdenPagoService.
  aprobadorAsignadoId?: string | null;
}
