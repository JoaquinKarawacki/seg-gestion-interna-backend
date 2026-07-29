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
import { ClientesService } from './clientes.service';
import { ActualizarClienteDto } from './dtos/actualizar-cliente.dto';
import { CrearClienteDto } from './dtos/crear-cliente.dto';
import { RespuestaClienteDto } from './dtos/respuesta-cliente.dto';

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
  ): Promise<RespuestaExitosa<RespuestaClienteDto>> {
    const datos = await this.clientesService.crear(dto);
    return { datos, mensaje: 'Cliente creado correctamente' };
  }

  @Patch(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarClienteDto,
  ): Promise<RespuestaExitosa<RespuestaClienteDto>> {
    const datos = await this.clientesService.actualizar(id, dto);
    return { datos, mensaje: 'Cliente actualizado correctamente' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param('id') id: string): Promise<void> {
    await this.clientesService.eliminar(id);
  }
}
