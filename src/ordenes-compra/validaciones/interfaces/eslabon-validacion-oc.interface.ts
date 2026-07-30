import { Prisma } from '../../../../generated/prisma/client';

export interface DatosValidacionOC {
  proveedorId: string;
  cotizacionId: string | null;
  monto: Prisma.Decimal;
}

export interface IEslabonValidacionOC {
  establecerSiguiente(eslabon: IEslabonValidacionOC): IEslabonValidacionOC;
  validar(datos: DatosValidacionOC): Promise<void>;
}
