import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { COTIZACIONES_REPOSITORIO } from '../../cotizaciones/interfaces/cotizaciones-repositorio.interface';
import type { ICotizacionesRepositorio } from '../../cotizaciones/interfaces/cotizaciones-repositorio.interface';
import { ORDENES_PAGO_REPOSITORIO } from '../interfaces/ordenes-pago-repositorio.interface';
import type { IOrdenesPagoRepositorio } from '../interfaces/ordenes-pago-repositorio.interface';
import { EslabonValidacionOPBase } from './eslabon-validacion-op.base';
import { DatosValidacionOP } from './interfaces/eslabon-validacion-op.interface';

@Injectable()
export class ValidarMontoNoExcedeCotizacionEslabon extends EslabonValidacionOPBase {
  constructor(
    @Inject(COTIZACIONES_REPOSITORIO)
    private readonly cotizacionesRepositorio: ICotizacionesRepositorio,
    @Inject(ORDENES_PAGO_REPOSITORIO)
    private readonly ordenesPagoRepositorio: IOrdenesPagoRepositorio,
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

    if (!cotizacion) {
      return;
    }

    const montoYaComprometido =
      await this.ordenesPagoRepositorio.sumarMontoPorCotizacion(
        datos.cotizacionId,
      );
    const montoTotalConNueva = montoYaComprometido.add(datos.monto);

    const excedeCotizacion = montoTotalConNueva.greaterThan(
      cotizacion.montoTotal,
    );

    // Advertencia + confirmar: si excede pero el usuario ya confirmó el exceso,
    // se permite. Sin confirmación, se bloquea para que el frontend muestre la
    // advertencia y reenvíe con confirmarExcesoMonto.
    if (excedeCotizacion && !datos.confirmarExcesoMonto) {
      throw new UnprocessableEntityException({
        error: 'MONTO_EXCEDE_COTIZACION',
        mensaje:
          'El monto de la orden de compra supera el saldo disponible de la cotización vinculada',
      });
    }
  }
}
