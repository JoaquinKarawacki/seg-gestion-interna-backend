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
import { ActualizarOrdenCompraDto } from './dtos/actualizar-orden-compra.dto';
import { CrearOrdenCompraDto } from './dtos/crear-orden-compra.dto';
import { RespuestaOrdenCompraDto } from './dtos/respuesta-orden-compra.dto';
import { OrdenesCompraService } from './ordenes-compra.service';

const TAMANIO_MAXIMO_ARCHIVO_BYTES = 10 * 1024 * 1024;

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

@Controller('ordenes-compra')
@UseGuards(JwtGuardia, RolesGuardia)
export class OrdenesCompraController {
  constructor(private readonly ordenesCompraService: OrdenesCompraService) {}

  @Get()
  async listar(): Promise<RespuestaLista<RespuestaOrdenCompraDto>> {
    const datos = await this.ordenesCompraService.listar();
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
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
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.ordenesCompraService.actualizar(id, dto);
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
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.ordenesCompraService.adjuntarFactura(id, factura);
    return { datos, mensaje: 'Factura adjuntada correctamente' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param('id') id: string): Promise<void> {
    await this.ordenesCompraService.eliminar(id);
  }
}
