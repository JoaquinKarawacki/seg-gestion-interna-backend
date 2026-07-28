import { IsString, MinLength } from 'class-validator';

export class CambiarContrasenaDto {
  @IsString()
  contrasenaActual!: string;

  @IsString()
  @MinLength(8)
  contrasenaNueva!: string;
}
