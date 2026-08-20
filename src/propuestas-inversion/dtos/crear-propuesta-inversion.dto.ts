import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsPositive,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Moneda } from '../../../generated/prisma/enums';

export class CrearPropuestaInversionDto {
  @IsUUID()
  proyectoId!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  costoTotalAproximado!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  ahorroMensual!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cantidadMeses!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  porcentajeSeg!: number;

  @IsEnum(Moneda)
  moneda!: Moneda;
}
