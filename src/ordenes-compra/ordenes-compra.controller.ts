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
import { EstadoOC } from '../../generated/prisma/enums';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import {
  RespuestaExitosa,
  RespuestaLista,
} from '../comun/tipos/respuesta-api.tipo';
import { ActualizarOrdenCompraDto } from './dtos/actualizar-orden-compra.dto';
import { CrearOrdenCompraDto } from './dtos/crear-orden-compra.dto';
import { RespuestaOrdenCompraDto } from './dtos/respuesta-orden-compra.dto';
import { OrdenesCompraService } from './ordenes-compra.service';

const TAMANIO_MAXIMO_ARCHIVO_BYTES = 10 * 1024 * 1024;
const PAGINA_DEFECTO = 1;
const POR_PAGINA_DEFECTO = 50;
const POR_PAGINA_MAXIMO = 200;

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

@Controller('ordenes-compra')
@UseGuards(JwtGuardia, RolesGuardia)
export class OrdenesCompraController {
  constructor(private readonly ordenesCompraService: OrdenesCompraService) {}

  @Get()
  async listar(
    @Query('proyectoId') proyectoId?: string,
    @Query('cotizacionId') cotizacionId?: string,
    @Query('estado') estado?: EstadoOC,
    @Query('sectorId') sectorId?: string,
    @Query('solicitanteId') solicitanteId?: string,
    @Query('pagina') paginaQuery?: string,
    @Query('porPagina') porPaginaQuery?: string,
  ): Promise<RespuestaLista<RespuestaOrdenCompraDto>> {
    const pagina = Math.max(1, Number.parseInt(paginaQuery ?? '', 10) || PAGINA_DEFECTO);
    const porPagina = Math.min(
      POR_PAGINA_MAXIMO,
      Math.max(1, Number.parseInt(porPaginaQuery ?? '', 10) || POR_PAGINA_DEFECTO),
    );

    const { datos, total } = await this.ordenesCompraService.listar(
      { proyectoId, cotizacionId, estado, sectorId, solicitanteId },
      { pagina, porPagina },
    );

    return { datos, total, pagina, porPagina };
  }

  @Get(':id')
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.ordenesCompraService.buscarPorId(id);
    return { datos, mensaje: 'Orden de compra obtenida correctamente' };
  }

  @Get(':id/factura')
  async descargarFactura(@Param('id') id: string): Promise<StreamableFile> {
    const { buffer, nombreArchivo } =
      await this.ordenesCompraService.descargarFactura(id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${nombreArchivo}"`,
    });
  }

  @Post()
  @UseInterceptors(FileInterceptor('factura'))
  async crear(
    @Body() dto: CrearOrdenCompraDto,
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
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.ordenesCompraService.crear(
      dto,
      solicitud.user,
      factura,
    );
    return { datos, mensaje: 'Orden de compra creada correctamente' };
  }

  @Patch(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarOrdenCompraDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.ordenesCompraService.actualizar(
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
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.ordenesCompraService.adjuntarFactura(
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
    await this.ordenesCompraService.eliminar(id, solicitud.user);
  }
}
