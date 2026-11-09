import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { TipoCuentaBancaria } from '../../../generated/prisma/enums';

export class CrearProveedorDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  rut!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsString()
  @IsNotEmpty()
  banco!: string;

  @IsEnum(TipoCuentaBancaria)
  tipoCuenta!: TipoCuentaBancaria;

  // Al menos uno de los dos es obligatorio (lo valida el service).
  @IsOptional()
  @IsString()
  numeroCuentaPesos?: string;

  @IsOptional()
  @IsString()
  numeroCuentaDolares?: string;
}
