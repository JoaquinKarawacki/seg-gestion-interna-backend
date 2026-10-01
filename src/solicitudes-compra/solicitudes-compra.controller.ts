import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { EstadoSolicitudCompra } from '../../generated/prisma/enums';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import {
  RespuestaExitosa,
  RespuestaLista,
} from '../comun/tipos/respuesta-api.tipo';
import { CrearSolicitudCompraDto } from './dtos/crear-solicitud-compra.dto';
import { RespuestaSolicitudCompraDto } from './dtos/respuesta-solicitud-compra.dto';
import { SolicitudesCompraService } from './solicitudes-compra.service';

const TAMANIO_MAXIMO_ARCHIVO_BYTES = 10 * 1024 * 1024;
const PAGINA_DEFECTO = 1;
const POR_PAGINA_DEFECTO = 50;
const POR_PAGINA_MAXIMO = 200;

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

@Controller('solicitudes-compra')
@UseGuards(JwtGuardia, RolesGuardia)
export class SolicitudesCompraController {
  constructor(
    private readonly solicitudesCompraService: SolicitudesCompraService,
  ) {}

  @Get()
  async listar(
    @Query('proyectoId') proyectoId?: string,
    @Query('estado') estado?: EstadoSolicitudCompra,
    @Query('sectorId') sectorId?: string,
    @Query('solicitanteId') solicitanteId?: string,
    @Query('pagina') paginaQuery?: string,
    @Query('porPagina') porPaginaQuery?: string,
  ): Promise<RespuestaLista<RespuestaSolicitudCompraDto>> {
    const pagina = Math.max(
      1,
      Number.parseInt(paginaQuery ?? '', 10) || PAGINA_DEFECTO,
    );
    const porPagina = Math.min(
      POR_PAGINA_MAXIMO,
      Math.max(
        1,
        Number.parseInt(porPaginaQuery ?? '', 10) || POR_PAGINA_DEFECTO,
      ),
    );
    // "sectorId" acepta lista separada por comas (encargado de varios sectores).
    const sectorIds = sectorId?.includes(',')
      ? sectorId.split(',').filter(Boolean)
      : sectorId;

    const { datos, total } = await this.solicitudesCompraService.listar(
      { proyectoId, estado, sectorId: sectorIds, solicitanteId },
      { pagina, porPagina },
    );

    return { datos, total, pagina, porPagina };
  }

  @Get(':id')
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<RespuestaExitosa<RespuestaSolicitudCompraDto>> {
    const datos = await this.solicitudesCompraService.buscarPorId(id);
    return { datos, mensaje: 'Orden de compra obtenida correctamente' };
  }

  @Get(':id/adjunto')
  async descargarAdjunto(@Param('id') id: string): Promise<StreamableFile> {
    const { buffer, nombreArchivo } =
      await this.solicitudesCompraService.descargarAdjunto(id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${nombreArchivo}"`,
    });
  }

  @Post()
  @UseInterceptors(FileInterceptor('adjunto'))
  async crear(
    @Body() dto: CrearSolicitudCompraDto,
    @Req() solicitud: SolicitudAutenticada,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'application/pdf' }),
          new MaxFileSizeValidator({ maxSize: TAMANIO_MAXIMO_ARCHIVO_BYTES }),
        ],
        fileIsRequired: true,
      }),
    )
    adjunto: Express.Multer.File,
  ): Promise<RespuestaExitosa<RespuestaSolicitudCompraDto>> {
    const datos = await this.solicitudesCompraService.crear(
      dto,
      solicitud.user,
      adjunto,
    );
    return { datos, mensaje: 'Orden de compra creada correctamente' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(
    @Param('id') id: string,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<void> {
    await this.solicitudesCompraService.eliminar(id, solicitud.user);
  }
}
