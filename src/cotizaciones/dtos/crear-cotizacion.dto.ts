import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Min,
} from 'class-validator';
import { Moneda } from '../../../generated/prisma/enums';

export class CrearCotizacionDto {
  @IsUUID()
  proyectoId!: string;

  @IsOptional()
  @IsUUID()
  tareaId?: string;

  @IsUUID()
  proveedorId!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  montoTotal!: number;

  // Solo tiene sentido para la cotización GENERAL del proyecto (tareaId
  // vacío) — CotizacionesService.crear() rechaza el request si viene junto
  // con tareaId.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  honorarios?: number;

  @IsEnum(Moneda)
  moneda!: Moneda;
}
