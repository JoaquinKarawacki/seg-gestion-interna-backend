import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CrearTareaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsUUID()
  proyectoId!: string;
}
