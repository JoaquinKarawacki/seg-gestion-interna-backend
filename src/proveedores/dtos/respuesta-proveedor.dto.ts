import { TipoCuentaBancaria } from '../../../generated/prisma/enums';

export class RespuestaProveedorDto {
  id!: string;
  nombre!: string;
  rut!: string;
  email!: string | null;
  telefono!: string | null;
  banco!: string;
  tipoCuenta!: TipoCuentaBancaria;
  numeroCuenta!: string;
}
