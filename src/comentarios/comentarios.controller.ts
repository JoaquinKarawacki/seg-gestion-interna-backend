import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { ComentariosService } from './comentarios.service';
import { CrearComentarioDto } from './dtos/crear-comentario.dto';
import { RespuestaComentarioDto } from './dtos/respuesta-comentario.dto';

type SolicitudAutenticada = Request & { user: UsuarioAutenticado };

@Controller('ordenes-compra')
@UseGuards(JwtGuardia, RolesGuardia)
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  @Post(':id/comentarios')
  @HttpCode(HttpStatus.CREATED)
  async crear(
    @Param('id') id: string,
    @Body() dto: CrearComentarioDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<RespuestaExitosa<RespuestaComentarioDto>> {
    const datos = await this.comentariosService.crear(id, dto, solicitud.user);
    return { datos, mensaje: 'Comentario agregado correctamente' };
  }

  @Get(':id/comentarios')
  async listar(
    @Param('id') id: string,
  ): Promise<RespuestaLista<RespuestaComentarioDto>> {
    const datos = await this.comentariosService.listar(id);
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }
}
