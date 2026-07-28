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
import { RolUsuario } from '../../generated/prisma/enums';
import { Roles } from '../comun/decoradores/roles.decorador';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import {
  RespuestaExitosa,
  RespuestaLista,
} from '../comun/tipos/respuesta-api.tipo';
import { ActualizarSectorDto } from './dtos/actualizar-sector.dto';
import { CrearSectorDto } from './dtos/crear-sector.dto';
import { RespuestaSectorDto } from './dtos/respuesta-sector.dto';
import { SectoresService } from './sectores.service';

@Controller('sectores')
@UseGuards(JwtGuardia, RolesGuardia)
@Roles(RolUsuario.ADMIN)
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
  async crear(
    @Body() dto: CrearSectorDto,
  ): Promise<RespuestaExitosa<RespuestaSectorDto>> {
    const datos = await this.sectoresService.crear(dto);
    return { datos, mensaje: 'Sector creado correctamente' };
  }

  @Patch(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarSectorDto,
  ): Promise<RespuestaExitosa<RespuestaSectorDto>> {
    const datos = await this.sectoresService.actualizar(id, dto);
    return { datos, mensaje: 'Sector actualizado correctamente' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param('id') id: string): Promise<void> {
    await this.sectoresService.eliminar(id);
  }
}
