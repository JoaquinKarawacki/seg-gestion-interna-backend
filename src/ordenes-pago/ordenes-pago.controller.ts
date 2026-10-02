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
  Patch,
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
import { EstadoOP } from '../../generated/prisma/enums';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import {
  RespuestaExitosa,
  RespuestaLista,
} from '../comun/tipos/respuesta-api.tipo';
import { ActualizarOrdenPagoDto } from './dtos/actualizar-orden-pago.dto';
import { CrearOrdenPagoDto } from './dtos/crear-orden-pago.dto';
import { RespuestaOrdenPagoDto } from './dtos/respuesta-orden-pago.dto';
import { OrdenesPagoService } from './ordenes-pago.service';

const TAMANIO_MAXIMO_ARCHIVO_BYTES = 10 * 1024 * 1024;
const PAGINA_DEFECTO = 1;
const POR_PAGINA_DEFECTO = 50;
const POR_PAGINA_MAXIMO = 200;

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

@Controller('ordenes-pago')
@UseGuards(JwtGuardia, RolesGuardia)
export class OrdenesPagoController {
  constructor(private readonly ordenesPagoService: OrdenesPagoService) {}

  @Get()
  async listar(
    @Query('proyectoId') proyectoId?: string,
    @Query('cotizacionId') cotizacionId?: string,
    @Query('estado') estado?: EstadoOP,
    @Query('sectorId') sectorId?: string,
    @Query('solicitanteId') solicitanteId?: string,
    @Query('pagina') paginaQuery?: string,
    @Query('porPagina') porPaginaQuery?: string,
  ): Promise<RespuestaLista<RespuestaOrdenPagoDto>> {
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
    // "sectorId" acepta una lista separada por comas (ej. un encargado de
    // varios sectores viendo "mis pendientes de aprobación" en el dashboard).
    const sectorIds = sectorId?.includes(',')
      ? sectorId.split(',').filter(Boolean)
      : sectorId;

    const { datos, total } = await this.ordenesPagoService.listar(
      { proyectoId, cotizacionId, estado, sectorId: sectorIds, solicitanteId },
      { pagina, porPagina },
    );

    return { datos, total, pagina, porPagina };
  }

  @Get(':id')
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<RespuestaExitosa<RespuestaOrdenPagoDto>> {
    const datos = await this.ordenesPagoService.buscarPorId(id);
    return { datos, mensaje: 'Orden de compra obtenida correctamente' };
  }

  @Get(':id/factura')
  async descargarFactura(@Param('id') id: string): Promise<StreamableFile> {
    const { buffer, nombreArchivo } =
      await this.ordenesPagoService.descargarFactura(id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${nombreArchivo}"`,
    });
  }

  @Post()
  @UseInterceptors(FileInterceptor('factura'))
  async crear(
    @Body() dto: CrearOrdenPagoDto,
    @Req() solicitud: SolicitudAutenticada,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'application/pdf' }),
          new MaxFileSizeValidator({ maxSize: TAMANIO_MAXIMO_ARCHIVO_BYTES }),
        ],
        fileIsRequired: false,
      }),
    )
    factura?: Express.Multer.File,
  ): Promise<RespuestaExitosa<RespuestaOrdenPagoDto>> {
    const datos = await this.ordenesPagoService.crear(
      dto,
      solicitud.user,
      factura,
    );
    return { datos, mensaje: 'Orden de compra creada correctamente' };
  }

  @Patch(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarOrdenPagoDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaOrdenPagoDto>> {
    const datos = await this.ordenesPagoService.actualizar(
      id,
      dto,
      solicitud.user,
    );
    return { datos, mensaje: 'Orden de compra actualizada correctamente' };
  }

  @Patch(':id/factura')
  @UseInterceptors(FileInterceptor('factura'))
  async adjuntarFactura(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'application/pdf' }),
          new MaxFileSizeValidator({ maxSize: TAMANIO_MAXIMO_ARCHIVO_BYTES }),
        ],
        fileIsRequired: true,
      }),
    )
    factura: Express.Multer.File,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaOrdenPagoDto>> {
    const datos = await this.ordenesPagoService.adjuntarFactura(
      id,
      factura,
      solicitud.user,
    );
    return { datos, mensaje: 'Factura adjuntada correctamente' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(
    @Param('id') id: string,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<void> {
    await this.ordenesPagoService.eliminar(id, solicitud.user);
  }
}
