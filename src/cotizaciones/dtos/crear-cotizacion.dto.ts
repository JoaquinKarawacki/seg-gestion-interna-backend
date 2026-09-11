import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsPositive,
  IsUUID,
} from 'class-validator';
import { Moneda } from '../../../generated/prisma/enums';

const convertirATexto = (valor: unknown) => valor === true || valor === 'true';

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

  @Transform(({ value }) => convertirATexto(value))
  @IsBoolean()
  ivaIncluido!: boolean;
}
