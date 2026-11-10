import { Type } from 'class-transformer';
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
import { Moneda, TipoOC } from '../../../generated/prisma/enums';

// Edición de una OC aprobada. No incluye categoria/proyecto/sector: esos quedan
// fijos. El cuerpo viaja como JSON (no multipart), por eso los booleanos no
// necesitan transformación desde string.
export class ModificarOrdenCompraDto {
  @IsEnum(TipoOC)
  tipo!: TipoOC;

  @IsUUID()
  proveedorId!: string;

  @IsEnum(Moneda)
  moneda!: Moneda;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  monto!: number;

  @IsString()
  @IsNotEmpty()
  concepto!: string;

  @IsBoolean()
  pagaIva!: boolean;

  @IsBoolean()
  ivaIncluido!: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
