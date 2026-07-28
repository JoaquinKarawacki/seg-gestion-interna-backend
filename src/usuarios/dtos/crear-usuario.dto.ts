import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { RolUsuario } from '../../../generated/prisma/enums';

export class CrearUsuarioDto {
  @IsString()
  nombre!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  contrasena!: string;

  @IsEnum(RolUsuario)
  rol!: RolUsuario;

  @IsOptional()
  @IsUUID()
  sectorId?: string;
}
