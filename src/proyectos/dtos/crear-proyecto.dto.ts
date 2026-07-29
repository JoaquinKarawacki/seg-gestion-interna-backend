import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CrearProyectoDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsUUID()
  clienteId!: string;
}
