import {
  EstadoSolicitudCompra,
  FormaPago,
  Moneda,
  TipoOC,
} from '../../../generated/prisma/enums';

export class RespuestaSolicitudCompraDto {
  id!: string;
  numero!: number;
  tipo!: TipoOC;
  fecha!: Date;
  solicitanteId!: string;
  sectorId!: string;
  proveedorId!: string;
  clienteId!: string | null;
  proyectoId!: string;
  rubroId!: string;
  tareaId!: string;
  cotizacionId!: string;
  moneda!: Moneda;
  monto!: string;
  concepto!: string;
  pagaIva!: boolean;
  ivaIncluido!: boolean;
  observaciones!: string | null;
  archivoPdfRuta!: string;
  estado!: EstadoSolicitudCompra;
  esPagoUnico!: boolean;
  pagoUnicoFormaPago!: FormaPago | null;
}
