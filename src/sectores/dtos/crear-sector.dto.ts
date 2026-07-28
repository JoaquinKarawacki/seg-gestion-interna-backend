import { IsString, MinLength } from 'class-validator';

export class CrearSectorDto {
  @IsString()
  @MinLength(2)
  nombre!: string;
}
