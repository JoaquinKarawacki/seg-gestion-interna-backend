import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import {
  RespuestaExitosa,
  RespuestaLista,
} from '../comun/tipos/respuesta-api.tipo';
import { CotizacionesService } from './cotizaciones.service';
import { CrearCotizacionDto } from './dtos/crear-cotizacion.dto';
import { RespuestaCotizacionDto } from './dtos/respuesta-cotizacion.dto';

const TAMANIO_MAXIMO_ARCHIVO_BYTES = 10 * 1024 * 1024;

// Sin prefijo de clase a proposito: las rutas de Cotizacion se reparten
// entre /cotizaciones y /proyectos/:proyectoId/cotizaciones porque el
// recurso se lee "anidado" bajo Proyecto pero conceptualmente le
// pertenece a este modulo, no a ProyectosModulo.
@Controller()
@UseGuards(JwtGuardia, RolesGuardia)
export class CotizacionesController {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  @Get('cotizaciones/:id')
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<RespuestaExitosa<RespuestaCotizacionDto>> {
    const datos = await this.cotizacionesService.buscarPorId(id);
    return { datos, mensaje: 'Cotización obtenida correctamente' };
  }

  @Get('proyectos/:proyectoId/cotizaciones')
  async listarPorProyecto(
    @Param('proyectoId') proyectoId: string,
  ): Promise<RespuestaLista<RespuestaCotizacionDto>> {
    const datos = await this.cotizacionesService.listarPorProyecto(proyectoId);
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }

  @Get('proyectos/:proyectoId/cotizaciones/activa')
  async buscarActivaPorProyecto(
    @Param('proyectoId') proyectoId: string,
  ): Promise<RespuestaExitosa<RespuestaCotizacionDto>> {
    const datos =
      await this.cotizacionesService.buscarActivaPorProyecto(proyectoId);
    return { datos, mensaje: 'Cotización activa obtenida correctamente' };
  }

  @Post('cotizaciones')
  @UseInterceptors(FileInterceptor('archivo'))
  async crear(
    @Body() dto: CrearCotizacionDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'application/pdf' }),
          new MaxFileSizeValidator({ maxSize: TAMANIO_MAXIMO_ARCHIVO_BYTES }),
        ],
        fileIsRequired: false,
      }),
    )
    archivo?: Express.Multer.File,
  ): Promise<RespuestaExitosa<RespuestaCotizacionDto>> {
    const datos = await this.cotizacionesService.crear(dto, archivo);
    return { datos, mensaje: 'Cotización creada correctamente' };
  }
}
