import { Module } from '@nestjs/common';
import { CotizacionesModulo } from '../cotizaciones/cotizaciones.modulo';
import { ExportacionCotizacionesController } from './exportacion-cotizaciones.controller';
import { ExportacionCotizacionesService } from './exportacion-cotizaciones.service';

// CotizacionesModulo exporta COTIZACIONES_REPOSITORIO, que es lo único que este
// módulo necesita para leer las cotizaciones a exportar.
@Module({
  imports: [CotizacionesModulo],
  controllers: [ExportacionCotizacionesController],
  providers: [ExportacionCotizacionesService],
})
export class ExportacionCotizacionesModulo {}
