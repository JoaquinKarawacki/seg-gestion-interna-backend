import { Controller, Get, StreamableFile, UseGuards } from '@nestjs/common';
import { RolUsuario } from '../../generated/prisma/enums';
import { Roles } from '../comun/decoradores/roles.decorador';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { ExportacionPagosService } from './exportacion-pagos.service';

const TIPO_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('exportacion-pagos')
@UseGuards(JwtGuardia, RolesGuardia)
export class ExportacionPagosController {
  constructor(
    private readonly exportacionPagosService: ExportacionPagosService,
  ) {}

  // Excel con las OPs aprobadas listas para pagar. Solo rol PAGOS. Devuelve el
  // binario directo (StreamableFile), salteando el envelope { datos, mensaje }.
  @Get()
  @Roles(RolUsuario.PAGOS)
  async exportarPagosAprobados(): Promise<StreamableFile> {
    const { buffer, nombreArchivo } =
      await this.exportacionPagosService.generarExcelPagosAprobados();
    return new StreamableFile(buffer, {
      type: TIPO_XLSX,
      disposition: `attachment; filename="${nombreArchivo}"`,
    });
  }
}
