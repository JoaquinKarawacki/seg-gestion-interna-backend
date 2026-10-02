import { Injectable } from '@nestjs/common';
import { DatosValidacionOP } from './interfaces/eslabon-validacion-op.interface';
import { ValidarMontoNoExcedeCotizacionEslabon } from './validar-monto-no-excede-cotizacion.eslabon';
import { ValidarProveedorCoincideCotizacionEslabon } from './validar-proveedor-coincide-cotizacion.eslabon';

@Injectable()
export class CadenaValidacionOP {
  constructor(
    private readonly validarProveedor: ValidarProveedorCoincideCotizacionEslabon,
    private readonly validarMonto: ValidarMontoNoExcedeCotizacionEslabon,
  ) {
    this.validarProveedor.establecerSiguiente(this.validarMonto);
  }

  async ejecutar(datos: DatosValidacionOP): Promise<void> {
    await this.validarProveedor.validar(datos);
  }
}
