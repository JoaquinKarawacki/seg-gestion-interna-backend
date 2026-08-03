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
import { ActualizarProveedorDto } from './dtos/actualizar-proveedor.dto';
import { CrearProveedorDto } from './dtos/crear-proveedor.dto';
import { RespuestaProveedorDto } from './dtos/respuesta-proveedor.dto';
import { ProveedoresService } from './proveedores.service';

const ROLES_EDICION = [
  RolUsuario.ADMIN,
  RolUsuario.PAGOS,
  RolUsuario.ENCARGADO,
];

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

@Controller('proveedores')
@UseGuards(JwtGuardia, RolesGuardia)
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Get()
  async listar(): Promise<RespuestaLista<RespuestaProveedorDto>> {
    const datos = await this.proveedoresService.listar();
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }

  @Get(':id')
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<RespuestaExitosa<RespuestaProveedorDto>> {
    const datos = await this.proveedoresService.buscarPorId(id);
    return { datos, mensaje: 'Proveedor obtenido correctamente' };
  }

  @Post()
  async crear(
    @Body() dto: CrearProveedorDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaProveedorDto>> {
    const datos = await this.proveedoresService.crear(dto, solicitud.user);
    return { datos, mensaje: 'Proveedor creado correctamente' };
  }

  @Patch(':id')
  @Roles(...ROLES_EDICION)
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarProveedorDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaProveedorDto>> {
    const datos = await this.proveedoresService.actualizar(
      id,
      dto,
      solicitud.user,
    );
    return { datos, mensaje: 'Proveedor actualizado correctamente' };
  }

  @Delete(':id')
  @Roles(...ROLES_EDICION)
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(
    @Param('id') id: string,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<void> {
    await this.proveedoresService.eliminar(id, solicitud.user);
  }
}
