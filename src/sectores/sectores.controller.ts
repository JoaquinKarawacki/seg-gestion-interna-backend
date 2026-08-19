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
import { ActualizarSectorDto } from './dtos/actualizar-sector.dto';
import { CrearSectorDto } from './dtos/crear-sector.dto';
import { RespuestaSectorDto } from './dtos/respuesta-sector.dto';
import { SectoresService } from './sectores.service';

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

@Controller('sectores')
@UseGuards(JwtGuardia, RolesGuardia)
export class SectoresController {
  constructor(private readonly sectoresService: SectoresService) {}

  @Get()
  async listar(): Promise<RespuestaLista<RespuestaSectorDto>> {
    const datos = await this.sectoresService.listar();
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }

  @Get(':id')
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<RespuestaExitosa<RespuestaSectorDto>> {
    const datos = await this.sectoresService.buscarPorId(id);
    return { datos, mensaje: 'Sector obtenido correctamente' };
  }

  @Post()
  @Roles(RolUsuario.ADMIN)
  async crear(
    @Body() dto: CrearSectorDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaSectorDto>> {
    const datos = await this.sectoresService.crear(dto, solicitud.user);
    return { datos, mensaje: 'Sector creado correctamente' };
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN)
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarSectorDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaSectorDto>> {
    const datos = await this.sectoresService.actualizar(
      id,
      dto,
      solicitud.user,
    );
    return { datos, mensaje: 'Sector actualizado correctamente' };
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(
    @Param('id') id: string,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<void> {
    await this.sectoresService.eliminar(id, solicitud.user);
  }
}
