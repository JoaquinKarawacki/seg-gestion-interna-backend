import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsPositive, IsUUID } from 'class-validator';
import { Moneda } from '../../../generated/prisma/enums';

export class CrearCotizacionDto {
  @IsUUID()
  proyectoId!: string;

  @IsUUID()
  tareaId!: string;

  @IsUUID()
  proveedorId!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  montoTotal!: number;

  @IsEnum(Moneda)
  moneda!: Moneda;
}
