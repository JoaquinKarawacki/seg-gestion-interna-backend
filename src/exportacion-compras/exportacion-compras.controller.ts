import { Controller, Get, StreamableFile, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { ExportacionComprasService } from './exportacion-compras.service';

const TIPO_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('exportacion-compras')
@UseGuards(JwtGuardia)
export class ExportacionComprasController {
  constructor(
    private readonly exportacionComprasService: ExportacionComprasService,
  ) {}

  // Excel con todas las OC vigentes (sin borradores ni anuladas). Disponible para
  // cualquier usuario autenticado. Devuelve el binario directo (StreamableFile),
  // salteando el envelope { datos, mensaje }.
  @Get()
  async exportarOrdenesCompra(): Promise<StreamableFile> {
    const { buffer, nombreArchivo } =
      await this.exportacionComprasService.generarExcelOrdenesCompra();
    return new StreamableFile(buffer, {
      type: TIPO_XLSX,
      disposition: `attachment; filename="${nombreArchivo}"`,
    });
  }
}
