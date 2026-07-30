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
  UseGuards,
} from '@nestjs/common';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import {
  RespuestaExitosa,
  RespuestaLista,
} from '../comun/tipos/respuesta-api.tipo';
import { ActualizarTareaDto } from './dtos/actualizar-tarea.dto';
import { CrearTareaDto } from './dtos/crear-tarea.dto';
import { RespuestaTareaDto } from './dtos/respuesta-tarea.dto';
import { TareasService } from './tareas.service';

@Controller()
@UseGuards(JwtGuardia, RolesGuardia)
export class TareasController {
  constructor(private readonly tareasService: TareasService) {}

  @Get('tareas')
  async listar(): Promise<RespuestaLista<RespuestaTareaDto>> {
    const datos = await this.tareasService.listar();
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }

  @Get('tareas/:id')
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<RespuestaExitosa<RespuestaTareaDto>> {
    const datos = await this.tareasService.buscarPorId(id);
    return { datos, mensaje: 'Tarea obtenida correctamente' };
  }

  @Get('proyectos/:proyectoId/tareas')
  async listarPorProyecto(
    @Param('proyectoId') proyectoId: string,
  ): Promise<RespuestaLista<RespuestaTareaDto>> {
    const datos = await this.tareasService.listarPorProyecto(proyectoId);
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }

  @Post('tareas')
  async crear(
    @Body() dto: CrearTareaDto,
  ): Promise<RespuestaExitosa<RespuestaTareaDto>> {
    const datos = await this.tareasService.crear(dto);
    return { datos, mensaje: 'Tarea creada correctamente' };
  }

  @Patch('tareas/:id')
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarTareaDto,
  ): Promise<RespuestaExitosa<RespuestaTareaDto>> {
    const datos = await this.tareasService.actualizar(id, dto);
    return { datos, mensaje: 'Tarea actualizada correctamente' };
  }

  @Delete('tareas/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param('id') id: string): Promise<void> {
    await this.tareasService.eliminar(id);
  }
}
