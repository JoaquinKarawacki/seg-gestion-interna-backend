import {
  DatosValidacionOC,
  IEslabonValidacionOC,
} from './interfaces/eslabon-validacion-oc.interface';

export abstract class EslabonValidacionOCBase implements IEslabonValidacionOC {
  private siguiente: IEslabonValidacionOC | null = null;

  establecerSiguiente(eslabon: IEslabonValidacionOC): IEslabonValidacionOC {
    this.siguiente = eslabon;
    return eslabon;
  }

  async validar(datos: DatosValidacionOC): Promise<void> {
    await this.ejecutarValidacion(datos);
    await this.siguiente?.validar(datos);
  }

  abstract ejecutarValidacion(datos: DatosValidacionOC): Promise<void>;
}
