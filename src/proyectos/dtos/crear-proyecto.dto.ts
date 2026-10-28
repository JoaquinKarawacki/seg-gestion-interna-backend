import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

const FORMATO_CODIGO_INVERSION = /^\d{5}PI\d{2}$/;

export class CrearProyectoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(FORMATO_CODIGO_INVERSION, {
    message:
      'El código de inversión debe tener el formato AANNN PI NN (ej. 26002PI01)',
  })
  codigoInversion!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsUUID()
  clienteId!: string;

  @IsOptional()
  @IsUUID()
  sectorId?: string;
}
