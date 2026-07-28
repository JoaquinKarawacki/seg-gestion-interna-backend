import { IsOptional, IsString, MinLength } from 'class-validator';

export class ActualizarSectorDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;
}
