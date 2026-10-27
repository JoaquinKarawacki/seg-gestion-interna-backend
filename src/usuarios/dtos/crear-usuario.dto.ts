import {
  IsArray,
  ArrayNotEmpty,
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

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(RolUsuario, { each: true })
  roles!: RolUsuario[];

  @IsOptional()
  @IsUUID()
  sectorId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sectoresEncargadoIds?: string[];
}
