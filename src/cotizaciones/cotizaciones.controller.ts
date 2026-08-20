import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import {
  RespuestaExitosa,
  RespuestaLista,
} from '../comun/tipos/respuesta-api.tipo';
import { CotizacionesService } from './cotizaciones.service';
import { CrearCotizacionDto } from './dtos/crear-cotizacion.dto';
import { RespuestaCotizacionDto } from './dtos/respuesta-cotizacion.dto';

const TAMANIO_MAXIMO_ARCHIVO_BYTES = 10 * 1024 * 1024;

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

// Sin prefijo de clase a proposito: las rutas de Cotizacion se reparten
// entre /cotizaciones, /proyectos/:proyectoId/cotizaciones y
// /tareas/:tareaId/cotizaciones porque el recurso se lee "anidado" bajo
// Proyecto/Tarea pero conceptualmente le pertenece a este modulo.
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
    archivo: Express.Multer.File | undefined,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaCotizacionDto>> {
    const datos = await this.cotizacionesService.crear(
      dto,
      solicitud.user,
      archivo,
    );
    return { datos, mensaje: 'Cotización creada correctamente' };
  }
}
