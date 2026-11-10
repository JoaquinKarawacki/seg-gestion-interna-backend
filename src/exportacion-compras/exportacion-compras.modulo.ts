import { Module } from '@nestjs/common';
import { OrdenesCompraModulo } from '../ordenes-compra/ordenes-compra.modulo';
import { ExportacionComprasController } from './exportacion-compras.controller';
import { ExportacionComprasService } from './exportacion-compras.service';

// OrdenesCompraModulo exporta ORDENES_COMPRA_REPOSITORIO, que es lo único que
// este módulo necesita para leer las OC a exportar.
@Module({
  imports: [OrdenesCompraModulo],
  controllers: [ExportacionComprasController],
  providers: [ExportacionComprasService],
})
export class ExportacionComprasModulo {}
