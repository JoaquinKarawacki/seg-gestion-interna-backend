import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import { RespuestaExitosa } from '../comun/tipos/respuesta-api.tipo';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import {
  RespuestaAuthDto,
  UsuarioAutenticadoDto,
} from './dtos/respuesta-auth.dto';

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
  ): Promise<RespuestaExitosa<RespuestaAuthDto>> {
    const datos = await this.authService.login(dto);
    return { datos, mensaje: 'Inicio de sesión exitoso' };
  }

  @Get('perfil')
  @UseGuards(JwtGuardia)
  async perfil(
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<UsuarioAutenticadoDto>> {
    const datos = await this.authService.obtenerPerfil(solicitud.user.id);
    return { datos, mensaje: 'Perfil obtenido correctamente' };
  }
}
