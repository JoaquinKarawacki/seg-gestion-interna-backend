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

  @IsString()
  @IsNotEmpty()
  numeroCuenta!: string;
}
