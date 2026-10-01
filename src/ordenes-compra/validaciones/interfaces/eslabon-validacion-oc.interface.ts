import { Prisma } from '../../../../generated/prisma/client';

export interface DatosValidacionOC {
  proveedorId: string;
  cotizacionId: string | null;
  monto: Prisma.Decimal;
  // Cuando es true, la validación de monto deja pasar un monto que supera el de
  // la cotización/OC vinculada (confirmación explícita del usuario).
  confirmarExcesoMonto?: boolean;
}

export interface IEslabonValidacionOC {
  establecerSiguiente(eslabon: IEslabonValidacionOC): IEslabonValidacionOC;
  validar(datos: DatosValidacionOC): Promise<void>;
}
