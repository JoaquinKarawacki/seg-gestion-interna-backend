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
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import {
  RespuestaExitosa,
  RespuestaLista,
} from '../comun/tipos/respuesta-api.tipo';
import { ActualizarProyectoDto } from './dtos/actualizar-proyecto.dto';
import { CrearProyectoDto } from './dtos/crear-proyecto.dto';
import { RespuestaProyectoDto } from './dtos/respuesta-proyecto.dto';
import { ProyectosService } from './proyectos.service';

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

@Controller('proyectos')
@UseGuards(JwtGuardia, RolesGuardia)
export class ProyectosController {
  constructor(private readonly proyectosService: ProyectosService) {}

  @Get()
  async listar(): Promise<RespuestaLista<RespuestaProyectoDto>> {
    const datos = await this.proyectosService.listar();
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }

  @Get(':id')
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<RespuestaExitosa<RespuestaProyectoDto>> {
    const datos = await this.proyectosService.buscarPorId(id);
    return { datos, mensaje: 'Proyecto obtenido correctamente' };
  }

  @Post()
  async crear(
    @Body() dto: CrearProyectoDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaProyectoDto>> {
    const datos = await this.proyectosService.crear(dto, solicitud.user);
    return { datos, mensaje: 'Proyecto creado correctamente' };
  }

  @Patch(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarProyectoDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaProyectoDto>> {
    const datos = await this.proyectosService.actualizar(
      id,
      dto,
      solicitud.user,
    );
    return { datos, mensaje: 'Proyecto actualizado correctamente' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(
    @Param('id') id: string,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<void> {
    await this.proyectosService.eliminar(id, solicitud.user);
  }
}
