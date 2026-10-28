import { Module } from '@nestjs/common';
import { OrdenesPagoModulo } from '../ordenes-pago/ordenes-pago.modulo';
import { ExportacionPagosController } from './exportacion-pagos.controller';
import { ExportacionPagosService } from './exportacion-pagos.service';

// OrdenesPagoModulo exporta ORDENES_PAGO_REPOSITORIO, que es lo único que este
// módulo necesita para leer las OPs aprobadas.
@Module({
  imports: [OrdenesPagoModulo],
  controllers: [ExportacionPagosController],
  providers: [ExportacionPagosService],
})
export class ExportacionPagosModulo {}
