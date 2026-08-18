import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { EstadoOC } from '../../generated/prisma/enums';
import {
  HistorialEstadoOCModel,
  OrdenCompraModel,
} from '../../generated/prisma/models';
import {
  DatosActualizarOrdenCompra,
  DatosCrearOrdenCompra,
  FiltrosOrdenCompra,
  IOrdenesCompraRepositorio,
  PaginacionOrdenCompra,
} from './interfaces/ordenes-compra-repositorio.interface';

@Injectable()
export class OrdenesCompraRepositorio implements IOrdenesCompraRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<OrdenCompraModel | null> {
    return this.prisma.ordenCompra.findUnique({ where: { id } });
  }

  async buscarTodos(): Promise<OrdenCompraModel[]> {
    return this.prisma.ordenCompra.findMany({ orderBy: { numero: 'desc' } });
  }

  async crear(datos: DatosCrearOrdenCompra): Promise<OrdenCompraModel> {
    return this.prisma.ordenCompra.create({ data: datos });
  }

  async actualizar(
    id: string,
    datos: DatosActualizarOrdenCompra,
  ): Promise<OrdenCompraModel> {
    return this.prisma.ordenCompra.update({ where: { id }, data: datos });
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.ordenCompra.delete({ where: { id } });
  }

  async sumarMontoPorCotizacion(cotizacionId: string): Promise<Prisma.Decimal> {
    const resultado = await this.prisma.ordenCompra.aggregate({
      where: {
        cotizacionId,
        estado: { not: EstadoOC.ANULADO },
      },
      _sum: { monto: true },
    });

    return resultado._sum.monto ?? new Prisma.Decimal(0);
  }

  async cambiarEstado(
    id: string,
    estadoNuevo: EstadoOC,
    usuarioId: string,
    motivo?: string | null,
  ): Promise<OrdenCompraModel> {
    return this.prisma.$transaction(async (tx) => {
      const ordenActual = await tx.ordenCompra.findUniqueOrThrow({
        where: { id },
      });

      const ordenActualizada = await tx.ordenCompra.update({
        where: { id },
        data: { estado: estadoNuevo },
      });

      await tx.historialEstadoOC.create({
        data: {
          ordenCompraId: id,
          estadoAnterior: ordenActual.estado,
          estadoNuevo,
          usuarioId,
          motivo: motivo ?? null,
        },
      });

      return ordenActualizada;
    });
  }

  async buscarHistorial(
    ordenCompraId: string,
  ): Promise<HistorialEstadoOCModel[]> {
    return this.prisma.historialEstadoOC.findMany({
      where: { ordenCompraId },
      orderBy: { creadoEn: 'asc' },
    });
  }

  async contarComentariosAsociados(ordenCompraId: string): Promise<number> {
    return this.prisma.comentario.count({ where: { ordenCompraId } });
  }

  async buscarConFiltros(
    filtros: FiltrosOrdenCompra,
    paginacion: PaginacionOrdenCompra,
  ): Promise<OrdenCompraModel[]> {
    return this.prisma.ordenCompra.findMany({
      where: {
        proyectoId: filtros.proyectoId,
        cotizacionId: filtros.cotizacionId,
        estado: filtros.estado,
        sectorId: filtros.sectorId,
        solicitanteId: filtros.solicitanteId,
      },
      orderBy: { numero: 'desc' },
      skip: (paginacion.pagina - 1) * paginacion.porPagina,
      take: paginacion.porPagina,
    });
  }

  async contarConFiltros(filtros: FiltrosOrdenCompra): Promise<number> {
    return this.prisma.ordenCompra.count({
      where: {
        proyectoId: filtros.proyectoId,
        cotizacionId: filtros.cotizacionId,
        estado: filtros.estado,
        sectorId: filtros.sectorId,
        solicitanteId: filtros.solicitanteId,
      },
    });
  }
}
