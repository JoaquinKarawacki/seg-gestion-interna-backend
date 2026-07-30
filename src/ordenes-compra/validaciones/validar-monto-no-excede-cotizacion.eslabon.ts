import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { COTIZACIONES_REPOSITORIO } from '../../cotizaciones/interfaces/cotizaciones-repositorio.interface';
import type { ICotizacionesRepositorio } from '../../cotizaciones/interfaces/cotizaciones-repositorio.interface';
import { ORDENES_COMPRA_REPOSITORIO } from '../interfaces/ordenes-compra-repositorio.interface';
import type { IOrdenesCompraRepositorio } from '../interfaces/ordenes-compra-repositorio.interface';
import { EslabonValidacionOCBase } from './eslabon-validacion-oc.base';
import { DatosValidacionOC } from './interfaces/eslabon-validacion-oc.interface';

@Injectable()
export class ValidarMontoNoExcedeCotizacionEslabon extends EslabonValidacionOCBase {
  constructor(
    @Inject(COTIZACIONES_REPOSITORIO)
    private readonly cotizacionesRepositorio: ICotizacionesRepositorio,
    @Inject(ORDENES_COMPRA_REPOSITORIO)
    private readonly ordenesCompraRepositorio: IOrdenesCompraRepositorio,
  ) {
    super();
  }

  async ejecutarValidacion(datos: DatosValidacionOC): Promise<void> {
    if (!datos.cotizacionId) {
      return;
    }

    const cotizacion = await this.cotizacionesRepositorio.buscarPorId(
      datos.cotizacionId,
    );

    if (!cotizacion) {
      return;
    }

    const montoYaComprometido =
      await this.ordenesCompraRepositorio.sumarMontoPorCotizacion(
        datos.cotizacionId,
      );
    const montoTotalConNueva = montoYaComprometido.add(datos.monto);

    if (montoTotalConNueva.greaterThan(cotizacion.montoTotal)) {
      throw new UnprocessableEntityException({
        error: 'MONTO_EXCEDE_COTIZACION',
        mensaje:
          'El monto de la orden de compra supera el saldo disponible de la cotización vinculada',
      });
    }
  }
}
