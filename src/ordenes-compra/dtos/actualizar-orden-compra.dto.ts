import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { FormaPago, Moneda, TipoOC } from '../../../generated/prisma/enums';

export class ActualizarOrdenCompraDto {
  @IsOptional()
  @IsEnum(TipoOC)
  tipo?: TipoOC;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsUUID()
  sectorId?: string;

  @IsOptional()
  @IsUUID()
  proveedorId?: string;

  @IsOptional()
  @IsEnum(Moneda)
  moneda?: Moneda;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  concepto?: string;

  @IsOptional()
  @IsEnum(FormaPago)
  formaPago?: FormaPago;

  @IsOptional()
  @IsBoolean()
  pagaIva?: boolean;

  @IsOptional()
  @IsBoolean()
  ivaIncluido?: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
