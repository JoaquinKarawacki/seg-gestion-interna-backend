import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Moneda, RolUsuario } from '../../generated/prisma/enums';
import { Roles } from '../comun/decoradores/roles.decorador';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import {
  RespuestaExitosa,
  RespuestaLista,
} from '../comun/tipos/respuesta-api.tipo';
import { ActualizarTipoCambioDto } from './dtos/actualizar-tipo-cambio.dto';
import { RespuestaTipoCambioDto } from './dtos/respuesta-tipo-cambio.dto';
import { TiposCambioService } from './tipos-cambio.service';

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

@Controller('tipos-cambio')
@UseGuards(JwtGuardia, RolesGuardia)
export class TiposCambioController {
  constructor(private readonly tiposCambioService: TiposCambioService) {}

  @Get()
  async listar(): Promise<RespuestaLista<RespuestaTipoCambioDto>> {
    const datos = await this.tiposCambioService.listar();
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }

  @Patch(':moneda')
  @Roles(RolUsuario.ADMIN)
  async actualizar(
    @Param('moneda') monedaParam: string,
    @Body() dto: ActualizarTipoCambioDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaTipoCambioDto>> {
    if (!Object.values(Moneda).includes(monedaParam as Moneda)) {
      throw new BadRequestException({
        error: 'MONEDA_INVALIDA',
        mensaje: `"${monedaParam}" no es una moneda válida`,
      });
    }

    const datos = await this.tiposCambioService.actualizar(
      monedaParam as Moneda,
      dto,
      solicitud.user,
    );
    return { datos, mensaje: 'Tipo de cambio actualizado correctamente' };
  }
}
