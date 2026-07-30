import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
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

  @IsEnum(Moneda)
  moneda!: Moneda;
}
