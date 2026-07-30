import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { FormaPago, Moneda, TipoOC } from '../../../generated/prisma/enums';

const convertirATexto = (valor: unknown) => valor === true || valor === 'true';

export class CrearOrdenCompraDto {
  @IsEnum(TipoOC)
  tipo!: TipoOC;

  @IsDateString()
  fecha!: string;

  @IsUUID()
  sectorId!: string;

  @IsUUID()
  proveedorId!: string;

  @IsOptional()
  @IsUUID()
  cotizacionId?: string;

  @IsEnum(Moneda)
  moneda!: Moneda;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  monto!: number;

  @IsString()
  @IsNotEmpty()
  concepto!: string;

  @IsEnum(FormaPago)
  formaPago!: FormaPago;

  @Transform(({ value }) => convertirATexto(value))
  @IsBoolean()
  pagaIva!: boolean;

  @Transform(({ value }) => convertirATexto(value))
  @IsBoolean()
  ivaIncluido!: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
