import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { TipoCuentaBancaria } from '../../../generated/prisma/enums';

export class ActualizarProveedorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  rut?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  banco?: string;

  @IsOptional()
  @IsEnum(TipoCuentaBancaria)
  tipoCuenta?: TipoCuentaBancaria;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  numeroCuenta?: string;
}
