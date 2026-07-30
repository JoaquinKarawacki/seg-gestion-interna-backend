import { IsNotEmpty, IsString } from 'class-validator';

export class ActualizarTareaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;
}
