import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ActualizarProyectoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsUUID()
  clienteId?: string;
}
