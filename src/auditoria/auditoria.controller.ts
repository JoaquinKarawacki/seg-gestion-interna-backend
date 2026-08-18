import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolUsuario } from '../../generated/prisma/enums';
import { Roles } from '../comun/decoradores/roles.decorador';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { RespuestaLista } from '../comun/tipos/respuesta-api.tipo';
import { AuditoriaService } from './auditoria.service';
import { RespuestaAuditoriaDto } from './dtos/respuesta-auditoria.dto';

const PAGINA_DEFECTO = 1;
const POR_PAGINA_DEFECTO = 50;
const POR_PAGINA_MAXIMO = 200;

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
    @Query('pagina') paginaQuery?: string,
    @Query('porPagina') porPaginaQuery?: string,
  ): Promise<RespuestaLista<RespuestaAuditoriaDto>> {
    const pagina = Math.max(1, Number.parseInt(paginaQuery ?? '', 10) || PAGINA_DEFECTO);
    const porPagina = Math.min(
      POR_PAGINA_MAXIMO,
      Math.max(1, Number.parseInt(porPaginaQuery ?? '', 10) || POR_PAGINA_DEFECTO),
    );

    const { datos, total } = await this.auditoriaService.listar(
      { accion, entidad, usuarioEmail },
      { pagina, porPagina },
    );

    return { datos, total, pagina, porPagina };
  }
}
