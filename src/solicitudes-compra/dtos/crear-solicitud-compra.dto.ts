import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { FormaPago, Moneda, TipoOC } from '../../../generated/prisma/enums';

const aBooleano = (valor: unknown) => valor === true || valor === 'true';

export class CrearSolicitudCompraDto {
  @IsEnum(TipoOC)
  tipo!: TipoOC;

  @IsUUID()
  sectorId!: string;

  @IsUUID()
  proveedorId!: string;

  @IsUUID()
  proyectoId!: string;

  // Rubro: se elige uno existente (rubroId) o se crea uno nuevo por nombre
  // (rubroNombre, caso "Otros"). El service valida que venga al menos uno.
  @IsOptional()
  @IsUUID()
  rubroId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  rubroNombre?: string;

  @IsEnum(Moneda)
  moneda!: Moneda;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  monto!: number;

  @IsString()
  @IsNotEmpty()
  concepto!: string;

  @Transform(({ value }) => aBooleano(value))
  @IsBoolean()
  pagaIva!: boolean;

  @Transform(({ value }) => aBooleano(value))
  @IsBoolean()
  ivaIncluido!: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;

  // Pago único: si es true, al aprobar la OC se genera sola una Orden de Pago por el
  // total con `pagoUnicoFormaPago`. El service valida que la forma de pago venga cuando
  // esPagoUnico es true (FORMA_PAGO_REQUERIDA_PAGO_UNICO).
  @Transform(({ value }) => aBooleano(value))
  @IsOptional()
  @IsBoolean()
  esPagoUnico?: boolean;

  @IsOptional()
  @IsEnum(FormaPago)
  pagoUnicoFormaPago?: FormaPago;
}
