import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { COTIZACIONES_REPOSITORIO } from '../../cotizaciones/interfaces/cotizaciones-repositorio.interface';
import type { ICotizacionesRepositorio } from '../../cotizaciones/interfaces/cotizaciones-repositorio.interface';
import { EslabonValidacionOPBase } from './eslabon-validacion-op.base';
import { DatosValidacionOP } from './interfaces/eslabon-validacion-op.interface';

@Injectable()
export class ValidarProveedorCoincideCotizacionEslabon extends EslabonValidacionOPBase {
  constructor(
    @Inject(COTIZACIONES_REPOSITORIO)
    private readonly cotizacionesRepositorio: ICotizacionesRepositorio,
  ) {
    super();
  }

  async ejecutarValidacion(datos: DatosValidacionOP): Promise<void> {
    if (!datos.cotizacionId) {
      return;
    }

    const cotizacion = await this.cotizacionesRepositorio.buscarPorId(
      datos.cotizacionId,
    );

    if (cotizacion && cotizacion.proveedorId !== datos.proveedorId) {
      throw new UnprocessableEntityException({
        error: 'PROVEEDOR_NO_COINCIDE_CON_COTIZACION',
        mensaje:
          'El proveedor de la orden de compra debe coincidir con el proveedor de la cotización vinculada',
      });
    }
  }
}
