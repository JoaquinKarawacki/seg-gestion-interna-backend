import { Controller, Get, StreamableFile, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { ExportacionCotizacionesService } from './exportacion-cotizaciones.service';

const TIPO_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('exportacion-cotizaciones')
@UseGuards(JwtGuardia)
export class ExportacionCotizacionesController {
  constructor(
    private readonly exportacionCotizacionesService: ExportacionCotizacionesService,
  ) {}

  // Excel con todas las cotizaciones. Disponible para cualquier usuario
  // autenticado. Devuelve el binario directo (StreamableFile), salteando el
  // envelope { datos, mensaje }.
  @Get()
  async exportarCotizaciones(): Promise<StreamableFile> {
    const { buffer, nombreArchivo } =
      await this.exportacionCotizacionesService.generarExcelCotizaciones();
    return new StreamableFile(buffer, {
      type: TIPO_XLSX,
      disposition: `attachment; filename="${nombreArchivo}"`,
    });
  }
}
