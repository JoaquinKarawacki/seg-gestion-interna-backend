import { Injectable } from '@nestjs/common';
import { AuditoriaModel } from '../../generated/prisma/models';
import { PrismaService } from '../prisma/prisma.service';
import {
  DatosCrearAuditoria,
  FiltrosAuditoria,
  IAuditoriaRepositorio,
  PaginacionAuditoria,
} from './interfaces/auditoria-repositorio.interface';

@Injectable()
export class AuditoriaRepositorio implements IAuditoriaRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async crear(datos: DatosCrearAuditoria): Promise<AuditoriaModel> {
    return this.prisma.auditoria.create({ data: datos });
  }

  async buscarConFiltros(
    filtros: FiltrosAuditoria,
    paginacion: PaginacionAuditoria,
  ): Promise<AuditoriaModel[]> {
    return this.prisma.auditoria.findMany({
      where: {
        accion: filtros.accion,
        entidad: filtros.entidad,
        usuarioEmail: filtros.usuarioEmail,
      },
      orderBy: { creadoEn: 'desc' },
      skip: (paginacion.pagina - 1) * paginacion.porPagina,
      take: paginacion.porPagina,
    });
  }

  async contarConFiltros(filtros: FiltrosAuditoria): Promise<number> {
    return this.prisma.auditoria.count({
      where: {
        accion: filtros.accion,
        entidad: filtros.entidad,
        usuarioEmail: filtros.usuarioEmail,
      },
    });
  }
}
