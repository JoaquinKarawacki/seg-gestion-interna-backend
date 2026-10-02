import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RolUsuario } from '../../../generated/prisma/enums';
import { Roles } from '../../comun/decoradores/roles.decorador';
import { JwtGuardia } from '../../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../../comun/guardias/roles.guardia';
import { UsuarioAutenticado } from '../../comun/interfaces/usuario-autenticado.interface';
import {
  RespuestaExitosa,
  RespuestaLista,
} from '../../comun/tipos/respuesta-api.tipo';
import { RespuestaOrdenCompraDto } from '../dtos/respuesta-orden-compra.dto';
import { MotivoTransicionDto } from './dtos/motivo-transicion.dto';
import { RespuestaHistorialOrdenCompraDto } from './dtos/respuesta-historial-orden-compra.dto';
import { OrdenesCompraAprobacionService } from './ordenes-compra-aprobacion.service';

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

@Controller('ordenes-compra')
@UseGuards(JwtGuardia, RolesGuardia)
export class OrdenesCompraAprobacionController {
  constructor(
    private readonly aprobacionService: OrdenesCompraAprobacionService,
  ) {}

  @Post(':id/enviar')
  @HttpCode(HttpStatus.OK)
  async enviar(
    @Param('id') id: string,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.aprobacionService.enviar(id, solicitud.user);
    return { datos, mensaje: 'Orden de compra enviada correctamente' };
  }

  @Post(':id/aprobar')
  @Roles(RolUsuario.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async aprobar(
    @Param('id') id: string,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.aprobacionService.aprobar(id, solicitud.user);
    return { datos, mensaje: 'Orden de compra aprobada correctamente' };
  }

  @Post(':id/rechazar')
  @Roles(RolUsuario.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async rechazar(
    @Param('id') id: string,
    @Body() dto: MotivoTransicionDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.aprobacionService.rechazar(
      id,
      solicitud.user,
      dto.motivo,
    );
    return { datos, mensaje: 'Orden de compra rechazada correctamente' };
  }

  @Post(':id/anular')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async anular(
    @Param('id') id: string,
    @Body() dto: MotivoTransicionDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.aprobacionService.anular(
      id,
      solicitud.user,
      dto.motivo,
    );
    return { datos, mensaje: 'Orden de compra anulada correctamente' };
  }

  @Get(':id/historial')
  async listarHistorial(
    @Param('id') id: string,
  ): Promise<RespuestaLista<RespuestaHistorialOrdenCompraDto>> {
    const datos = await this.aprobacionService.listarHistorial(id);
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }
}
