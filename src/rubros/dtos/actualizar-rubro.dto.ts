import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class ActualizarRubroDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
