import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CrearProyectoDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsUUID()
  clienteId!: string;

  @IsOptional()
  @IsUUID()
  sectorId?: string;
}
