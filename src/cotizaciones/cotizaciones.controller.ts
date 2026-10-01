import {
  Controller,
  Get,
  Param,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import {
  RespuestaExitosa,
  RespuestaLista,
} from '../comun/tipos/respuesta-api.tipo';
import { CotizacionesService } from './cotizaciones.service';
import { RespuestaCotizacionBusquedaDto } from './dtos/respuesta-cotizacion-busqueda.dto';
import { RespuestaCotizacionDto } from './dtos/respuesta-cotizacion.dto';

// Sin prefijo de clase a proposito: las rutas de Cotizacion se reparten entre
// /cotizaciones, /proyectos/:proyectoId/cotizaciones y
// /tareas/:tareaId/cotizaciones. La creacion ya NO se expone acá: una
// cotización solo nace desde el flujo de Orden de Compra.
@Controller()
@UseGuards(JwtGuardia, RolesGuardia)
export class CotizacionesController {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  @Get('cotizaciones')
  async listarParaBusqueda(): Promise<
    RespuestaLista<RespuestaCotizacionBusquedaDto>
  > {
    const datos = await this.cotizacionesService.listarParaBusqueda();
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }

  @Get('cotizaciones/:id')
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<RespuestaExitosa<RespuestaCotizacionDto>> {
    const datos = await this.cotizacionesService.buscarPorId(id);
    return { datos, mensaje: 'Cotización obtenida correctamente' };
  }

  @Get('cotizaciones/:id/archivo')
  async descargarArchivo(@Param('id') id: string): Promise<StreamableFile> {
    const { buffer, nombreArchivo } =
      await this.cotizacionesService.descargarArchivo(id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${nombreArchivo}"`,
    });
  }

  @Get('proyectos/:proyectoId/cotizaciones')
  async listarPorProyecto(
    @Param('proyectoId') proyectoId: string,
  ): Promise<RespuestaLista<RespuestaCotizacionDto>> {
    const datos = await this.cotizacionesService.listarPorProyecto(proyectoId);
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }

  @Get('tareas/:tareaId/cotizaciones')
  async listarPorTarea(
    @Param('tareaId') tareaId: string,
  ): Promise<RespuestaLista<RespuestaCotizacionDto>> {
    const datos = await this.cotizacionesService.listarPorTarea(tareaId);
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }

  @Get('tareas/:tareaId/cotizaciones/activa')
  async buscarActivaPorTarea(
    @Param('tareaId') tareaId: string,
  ): Promise<RespuestaExitosa<RespuestaCotizacionDto>> {
    const datos = await this.cotizacionesService.buscarActivaPorTarea(tareaId);
    return { datos, mensaje: 'Cotización activa obtenida correctamente' };
  }
}
