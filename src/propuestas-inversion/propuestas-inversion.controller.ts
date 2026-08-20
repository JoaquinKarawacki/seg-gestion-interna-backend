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
import { PropuestasInversionService } from './propuestas-inversion.service';
import { CrearPropuestaInversionDto } from './dtos/crear-propuesta-inversion.dto';
import { RespuestaPropuestaInversionDto } from './dtos/respuesta-propuesta-inversion.dto';

const TAMANIO_MAXIMO_ARCHIVO_BYTES = 10 * 1024 * 1024;
const TIPOS_ARCHIVO_PERMITIDOS =
  /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|image\/jpeg|image\/png)$/;

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

// Sin prefijo de clase a proposito: las rutas de PropuestaInversion se
// reparten entre /propuestas-inversion y
// /proyectos/:proyectoId/propuestas-inversion (mismo criterio que
// CotizacionesController).
@Controller()
@UseGuards(JwtGuardia, RolesGuardia)
export class PropuestasInversionController {
  constructor(
    private readonly propuestasInversionService: PropuestasInversionService,
  ) {}

  @Get('propuestas-inversion/:id')
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<RespuestaExitosa<RespuestaPropuestaInversionDto>> {
    const datos = await this.propuestasInversionService.buscarPorId(id);
    return { datos, mensaje: 'Propuesta de inversión obtenida correctamente' };
  }

  @Get('propuestas-inversion/:id/archivo')
  async descargarArchivo(@Param('id') id: string): Promise<StreamableFile> {
    const { buffer, mimeType, nombreArchivo } =
      await this.propuestasInversionService.descargarArchivo(id);
    return new StreamableFile(buffer, {
      type: mimeType,
      disposition: `inline; filename="${nombreArchivo}"`,
    });
  }

  @Get('proyectos/:proyectoId/propuestas-inversion')
  async listarPorProyecto(
    @Param('proyectoId') proyectoId: string,
  ): Promise<RespuestaLista<RespuestaPropuestaInversionDto>> {
    const datos =
      await this.propuestasInversionService.listarPorProyecto(proyectoId);
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }

  @Get('proyectos/:proyectoId/propuestas-inversion/activa')
  async buscarActivaPorProyecto(
    @Param('proyectoId') proyectoId: string,
  ): Promise<RespuestaExitosa<RespuestaPropuestaInversionDto>> {
    const datos =
      await this.propuestasInversionService.buscarActivaPorProyecto(proyectoId);
    return {
      datos,
      mensaje: 'Propuesta de inversión activa obtenida correctamente',
    };
  }

  @Post('propuestas-inversion')
  @UseInterceptors(FileInterceptor('archivo'))
  async crear(
    @Body() dto: CrearPropuestaInversionDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: TIPOS_ARCHIVO_PERMITIDOS }),
          new MaxFileSizeValidator({ maxSize: TAMANIO_MAXIMO_ARCHIVO_BYTES }),
        ],
        fileIsRequired: false,
      }),
    )
    archivo: Express.Multer.File | undefined,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaPropuestaInversionDto>> {
    const datos = await this.propuestasInversionService.crear(
      dto,
      solicitud.user,
      archivo,
    );
    return { datos, mensaje: 'Propuesta de inversión creada correctamente' };
  }
}
