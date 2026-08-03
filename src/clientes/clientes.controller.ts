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
import { ClientesService } from './clientes.service';
import { ActualizarClienteDto } from './dtos/actualizar-cliente.dto';
import { CrearClienteDto } from './dtos/crear-cliente.dto';
import { RespuestaClienteDto } from './dtos/respuesta-cliente.dto';

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

@Controller('clientes')
@UseGuards(JwtGuardia, RolesGuardia)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  async listar(): Promise<RespuestaLista<RespuestaClienteDto>> {
    const datos = await this.clientesService.listar();
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }

  @Get(':id')
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<RespuestaExitosa<RespuestaClienteDto>> {
    const datos = await this.clientesService.buscarPorId(id);
    return { datos, mensaje: 'Cliente obtenido correctamente' };
  }

  @Post()
  async crear(
    @Body() dto: CrearClienteDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaClienteDto>> {
    const datos = await this.clientesService.crear(dto, solicitud.user);
    return { datos, mensaje: 'Cliente creado correctamente' };
  }

  @Patch(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarClienteDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaClienteDto>> {
    const datos = await this.clientesService.actualizar(
      id,
      dto,
      solicitud.user,
    );
    return { datos, mensaje: 'Cliente actualizado correctamente' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(
    @Param('id') id: string,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<void> {
    await this.clientesService.eliminar(id, solicitud.user);
  }
}
