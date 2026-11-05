import {
  CategoriaOrdenCompra,
  EstadoOC,
  FormaPago,
  Moneda,
  TipoOC,
} from '../../../generated/prisma/enums';

export class RespuestaOrdenCompraDto {
  id!: string;
  numero!: number;
  categoria!: CategoriaOrdenCompra;
  tipo!: TipoOC;
  fecha!: Date;
  solicitanteId!: string;
  sectorId!: string;
  proveedorId!: string;
  clienteId!: string | null;
  proyectoId!: string | null;
  cotizacionId!: string;
  moneda!: Moneda;
  monto!: string;
  concepto!: string;
  pagaIva!: boolean;
  ivaIncluido!: boolean;
  observaciones!: string | null;
  archivoPdfRuta!: string | null;
  estado!: EstadoOC;
  esPagoUnico!: boolean;
  pagoUnicoFormaPago!: FormaPago | null;
}
