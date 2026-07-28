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
import { ActualizarUsuarioDto } from './dtos/actualizar-usuario.dto';
import { CambiarContrasenaDto } from './dtos/cambiar-contrasena.dto';
import { CrearUsuarioDto } from './dtos/crear-usuario.dto';
import { RespuestaUsuarioDto } from './dtos/respuesta-usuario.dto';
import { UsuariosService } from './usuarios.service';

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

@Controller('usuarios')
@UseGuards(JwtGuardia, RolesGuardia)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Patch('mi-contrasena')
  async cambiarMiContrasena(
    @Req() solicitud: SolicitudAutenticada,
    @Body() dto: CambiarContrasenaDto,
  ): Promise<RespuestaExitosa<null>> {
    await this.usuariosService.cambiarContrasena(solicitud.user.id, dto);
    return { datos: null, mensaje: 'Contraseña actualizada correctamente' };
  }

  @Get()
  @Roles(RolUsuario.ADMIN)
  async listar(): Promise<RespuestaLista<RespuestaUsuarioDto>> {
    const datos = await this.usuariosService.listar();
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN)
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<RespuestaExitosa<RespuestaUsuarioDto>> {
    const datos = await this.usuariosService.buscarPorId(id);
    return { datos, mensaje: 'Usuario obtenido correctamente' };
  }

  @Post()
  @Roles(RolUsuario.ADMIN)
  async crear(
    @Body() dto: CrearUsuarioDto,
  ): Promise<RespuestaExitosa<RespuestaUsuarioDto>> {
    const datos = await this.usuariosService.crear(dto);
    return { datos, mensaje: 'Usuario creado correctamente' };
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN)
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarUsuarioDto,
  ): Promise<RespuestaExitosa<RespuestaUsuarioDto>> {
    const datos = await this.usuariosService.actualizar(id, dto);
    return { datos, mensaje: 'Usuario actualizado correctamente' };
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param('id') id: string): Promise<void> {
    await this.usuariosService.eliminar(id);
  }
}
