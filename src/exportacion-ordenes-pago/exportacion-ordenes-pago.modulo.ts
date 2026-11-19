import { Module } from '@nestjs/common';
import { OrdenesPagoModulo } from '../ordenes-pago/ordenes-pago.modulo';
import { ExportacionOrdenesPagoController } from './exportacion-ordenes-pago.controller';
import { ExportacionOrdenesPagoService } from './exportacion-ordenes-pago.service';

// OrdenesPagoModulo exporta ORDENES_PAGO_REPOSITORIO, que es lo único que este
// módulo necesita para leer las OP a exportar.
@Module({
  imports: [OrdenesPagoModulo],
  controllers: [ExportacionOrdenesPagoController],
  providers: [ExportacionOrdenesPagoService],
})
export class ExportacionOrdenesPagoModulo {}
