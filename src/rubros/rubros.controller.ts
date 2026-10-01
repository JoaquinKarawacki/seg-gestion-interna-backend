import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RolUsuario } from '../../generated/prisma/enums';
import { Roles } from '../comun/decoradores/roles.decorador';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import {
  RespuestaExitosa,
  RespuestaLista,
} from '../comun/tipos/respuesta-api.tipo';
import { ActualizarRubroDto } from './dtos/actualizar-rubro.dto';
import { CrearRubroDto } from './dtos/crear-rubro.dto';
import { RespuestaRubroDto } from './dtos/respuesta-rubro.dto';
import { RubrosService } from './rubros.service';

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

@Controller('rubros')
@UseGuards(JwtGuardia, RolesGuardia)
export class RubrosController {
  constructor(private readonly rubrosService: RubrosService) {}

  @Get()
  async listar(): Promise<RespuestaLista<RespuestaRubroDto>> {
    const datos = await this.rubrosService.listar();
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }

  @Get(':id')
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<RespuestaExitosa<RespuestaRubroDto>> {
    const datos = await this.rubrosService.buscarPorId(id);
    return { datos, mensaje: 'Rubro obtenido correctamente' };
  }

  @Post()
  @Roles(RolUsuario.ADMIN)
  async crear(
    @Body() dto: CrearRubroDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaRubroDto>> {
    const datos = await this.rubrosService.crear(dto, solicitud.user);
    return { datos, mensaje: 'Rubro creado correctamente' };
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN)
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarRubroDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaRubroDto>> {
    const datos = await this.rubrosService.actualizar(id, dto, solicitud.user);
    return { datos, mensaje: 'Rubro actualizado correctamente' };
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(
    @Param('id') id: string,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<void> {
    await this.rubrosService.eliminar(id, solicitud.user);
  }
}
