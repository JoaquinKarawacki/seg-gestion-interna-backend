import { IsString, MinLength } from 'class-validator';

export class CrearRubroDto {
  @IsString()
  @MinLength(2)
  nombre!: string;
}
