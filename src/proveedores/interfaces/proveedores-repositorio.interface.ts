import { TipoCuentaBancaria } from '../../../generated/prisma/enums';
import { ProveedorModel } from '../../../generated/prisma/models';
import { IRepositorioBase } from '../../comun/interfaces/repositorio-base.interface';

export const PROVEEDORES_REPOSITORIO = Symbol('IProveedoresRepositorio');

export interface DatosCrearProveedor {
  nombre: string;
  rut: string;
  email?: string | null;
  telefono?: string | null;
  banco: string;
  tipoCuenta: TipoCuentaBancaria;
  numeroCuenta: string;
}

export interface DatosActualizarProveedor {
  nombre?: string;
  rut?: string;
  email?: string | null;
  telefono?: string | null;
  banco?: string;
  tipoCuenta?: TipoCuentaBancaria;
  numeroCuenta?: string;
}

export interface IProveedoresRepositorio extends IRepositorioBase<
  ProveedorModel,
  DatosCrearProveedor,
  DatosActualizarProveedor
> {
  contarCotizacionesAsociadas(proveedorId: string): Promise<number>;
}
