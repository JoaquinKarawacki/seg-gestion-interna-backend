import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolUsuario } from '../../generated/prisma/enums';
import { Roles } from '../comun/decoradores/roles.decorador';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { RespuestaLista } from '../comun/tipos/respuesta-api.tipo';
import { AuditoriaService } from './auditoria.service';
import { RespuestaAuditoriaDto } from './dtos/respuesta-auditoria.dto';

@Controller('auditoria')
@UseGuards(JwtGuardia, RolesGuardia)
@Roles(RolUsuario.ADMIN)
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  async listar(
    @Query('accion') accion?: string,
    @Query('entidad') entidad?: string,
    @Query('usuarioEmail') usuarioEmail?: string,
  ): Promise<RespuestaLista<RespuestaAuditoriaDto>> {
    const datos = await this.auditoriaService.listar({
      accion,
      entidad,
      usuarioEmail,
    });

    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }
}
