import {
  EstadoOC,
  FormaPago,
  Moneda,
  TipoOC,
} from '../../../generated/prisma/enums';

export class RespuestaOrdenCompraDto {
  id!: string;
  numero!: number;
  tipo!: TipoOC;
  fecha!: Date;
  sectorId!: string;
  proveedorId!: string;
  clienteId!: string | null;
  proyectoId!: string | null;
  tareaId!: string | null;
  cotizacionId!: string | null;
  moneda!: Moneda;
  monto!: string;
  concepto!: string;
  formaPago!: FormaPago;
  pagaIva!: boolean;
  ivaIncluido!: boolean;
  observaciones!: string | null;
  facturaPdfRuta!: string | null;
  estado!: EstadoOC;
}
