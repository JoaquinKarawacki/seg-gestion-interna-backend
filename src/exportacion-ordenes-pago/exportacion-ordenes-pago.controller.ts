import { Controller, Get, StreamableFile, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { ExportacionOrdenesPagoService } from './exportacion-ordenes-pago.service';

const TIPO_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('exportacion-ordenes-pago')
@UseGuards(JwtGuardia)
export class ExportacionOrdenesPagoController {
  constructor(
    private readonly exportacionOrdenesPagoService: ExportacionOrdenesPagoService,
  ) {}

  // Excel con todas las OP vigentes (sin borradores ni anuladas). Disponible para
  // cualquier usuario autenticado; distinto del Excel de pagos a ejecutar
  // (/exportacion-pagos, solo PAGOS). Devuelve el binario directo
  // (StreamableFile), salteando el envelope { datos, mensaje }.
  @Get()
  async exportarOrdenesPago(): Promise<StreamableFile> {
    const { buffer, nombreArchivo } =
      await this.exportacionOrdenesPagoService.generarExcelOrdenesPago();
    return new StreamableFile(buffer, {
      type: TIPO_XLSX,
      disposition: `attachment; filename="${nombreArchivo}"`,
    });
  }
}
