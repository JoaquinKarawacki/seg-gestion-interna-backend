import { Prisma } from '../../../../generated/prisma/client';

export interface DatosValidacionOP {
  proveedorId: string;
  cotizacionId: string | null;
  monto: Prisma.Decimal;
  // Cuando es true, la validación de monto deja pasar un monto que supera el de
  // la cotización/OC vinculada (confirmación explícita del usuario).
  confirmarExcesoMonto?: boolean;
}

export interface IEslabonValidacionOP {
  establecerSiguiente(eslabon: IEslabonValidacionOP): IEslabonValidacionOP;
  validar(datos: DatosValidacionOP): Promise<void>;
}
