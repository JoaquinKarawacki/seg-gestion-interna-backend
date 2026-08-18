import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuditoriaModel } from '../../generated/prisma/models';
import { RespuestaAuditoriaDto } from './dtos/respuesta-auditoria.dto';
import {
  AUDITORIA_REPOSITORIO,
  DatosCrearAuditoria,
  FiltrosAuditoria,
  PaginacionAuditoria,
} from './interfaces/auditoria-repositorio.interface';
import type { IAuditoriaRepositorio } from './interfaces/auditoria-repositorio.interface';

export interface ResultadoListarAuditoria {
  datos: RespuestaAuditoriaDto[];
  total: number;
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(
    @Inject(AUDITORIA_REPOSITORIO)
    private readonly auditoriaRepositorio: IAuditoriaRepositorio,
  ) {}

  // Nunca relanza: un fallo al registrar auditoría no debe romper
  // la operación de negocio que ya se completó con éxito.
  async registrar(datos: DatosCrearAuditoria): Promise<void> {
    try {
      await this.auditoriaRepositorio.crear(datos);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(`No se pudo registrar la auditoría: ${mensaje}`);
    }
  }

  async listar(
    filtros: FiltrosAuditoria,
    paginacion: PaginacionAuditoria,
  ): Promise<ResultadoListarAuditoria> {
    const [registros, total] = await Promise.all([
      this.auditoriaRepositorio.buscarConFiltros(filtros, paginacion),
      this.auditoriaRepositorio.contarConFiltros(filtros),
    ]);

    return {
      datos: registros.map((registro) => this.mapearRespuesta(registro)),
      total,
    };
  }

  private mapearRespuesta(registro: AuditoriaModel): RespuestaAuditoriaDto {
    return {
      id: registro.id,
      usuarioId: registro.usuarioId,
      usuarioEmail: registro.usuarioEmail,
      accion: registro.accion,
      descripcion: registro.descripcion,
      entidad: registro.entidad,
      entidadId: registro.entidadId,
      creadoEn: registro.creadoEn,
    };
  }
}
