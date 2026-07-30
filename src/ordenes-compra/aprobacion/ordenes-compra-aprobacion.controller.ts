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
import { MotivoTransicionOpcionalDto } from './dtos/motivo-transicion-opcional.dto';
import { MotivoTransicionDto } from './dtos/motivo-transicion.dto';
import { RespuestaHistorialEstadoOCDto } from './dtos/respuesta-historial-estado-oc.dto';
import { OrdenesCompraAprobacionService } from './ordenes-compra-aprobacion.service';

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

@Controller('ordenes-compra')
@UseGuards(JwtGuardia, RolesGuardia)
export class OrdenesCompraAprobacionController {
  constructor(
    private readonly ordenesCompraAprobacionService: OrdenesCompraAprobacionService,
  ) {}

  @Post(':id/enviar')
  @HttpCode(HttpStatus.OK)
  async enviar(
    @Param('id') id: string,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.ordenesCompraAprobacionService.enviar(
      id,
      solicitud.user,
    );
    return { datos, mensaje: 'Orden de compra enviada correctamente' };
  }

  @Post(':id/aprobar')
  @Roles(RolUsuario.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async aprobar(
    @Param('id') id: string,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.ordenesCompraAprobacionService.aprobar(
      id,
      solicitud.user,
    );
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
    const datos = await this.ordenesCompraAprobacionService.rechazar(
      id,
      solicitud.user,
      dto.motivo,
    );
    return { datos, mensaje: 'Orden de compra rechazada correctamente' };
  }

  @Post(':id/observar-pago')
  @Roles(RolUsuario.PAGOS)
  @HttpCode(HttpStatus.OK)
  async observarPago(
    @Param('id') id: string,
    @Body() dto: MotivoTransicionDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.ordenesCompraAprobacionService.observarPago(
      id,
      solicitud.user,
      dto.motivo,
    );
    return { datos, mensaje: 'Pago observado correctamente' };
  }

  @Post(':id/resolver-observacion')
  @Roles(RolUsuario.PAGOS)
  @HttpCode(HttpStatus.OK)
  async resolverObservacion(
    @Param('id') id: string,
    @Body() dto: MotivoTransicionOpcionalDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.ordenesCompraAprobacionService.resolverObservacion(
      id,
      solicitud.user,
      dto.motivo,
    );
    return { datos, mensaje: 'Observación resuelta correctamente' };
  }

  @Post(':id/confirmar-pago')
  @Roles(RolUsuario.PAGOS)
  @HttpCode(HttpStatus.OK)
  async confirmarPago(
    @Param('id') id: string,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.ordenesCompraAprobacionService.confirmarPago(
      id,
      solicitud.user,
    );
    return { datos, mensaje: 'Pago confirmado correctamente' };
  }

  @Post(':id/anular')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async anular(
    @Param('id') id: string,
    @Body() dto: MotivoTransicionDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaOrdenCompraDto>> {
    const datos = await this.ordenesCompraAprobacionService.anular(
      id,
      solicitud.user,
      dto.motivo,
    );
    return { datos, mensaje: 'Orden de compra anulada correctamente' };
  }

  @Get(':id/historial')
  async listarHistorial(
    @Param('id') id: string,
  ): Promise<RespuestaLista<RespuestaHistorialEstadoOCDto>> {
    const datos = await this.ordenesCompraAprobacionService.listarHistorial(id);
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }
}
