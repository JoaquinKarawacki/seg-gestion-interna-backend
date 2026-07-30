import { Injectable } from '@nestjs/common';
import { DatosValidacionOC } from './interfaces/eslabon-validacion-oc.interface';
import { ValidarMontoNoExcedeCotizacionEslabon } from './validar-monto-no-excede-cotizacion.eslabon';
import { ValidarProveedorCoincideCotizacionEslabon } from './validar-proveedor-coincide-cotizacion.eslabon';

@Injectable()
export class CadenaValidacionOC {
  constructor(
    private readonly validarProveedor: ValidarProveedorCoincideCotizacionEslabon,
    private readonly validarMonto: ValidarMontoNoExcedeCotizacionEslabon,
  ) {
    this.validarProveedor.establecerSiguiente(this.validarMonto);
  }

  async ejecutar(datos: DatosValidacionOC): Promise<void> {
    await this.validarProveedor.validar(datos);
  }
}
