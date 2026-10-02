import {
  DatosValidacionOP,
  IEslabonValidacionOP,
} from './interfaces/eslabon-validacion-op.interface';

export abstract class EslabonValidacionOPBase implements IEslabonValidacionOP {
  private siguiente: IEslabonValidacionOP | null = null;

  establecerSiguiente(eslabon: IEslabonValidacionOP): IEslabonValidacionOP {
    this.siguiente = eslabon;
    return eslabon;
  }

  async validar(datos: DatosValidacionOP): Promise<void> {
    await this.ejecutarValidacion(datos);
    await this.siguiente?.validar(datos);
  }

  abstract ejecutarValidacion(datos: DatosValidacionOP): Promise<void>;
}
