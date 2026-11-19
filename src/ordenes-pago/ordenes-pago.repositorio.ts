import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { EstadoOP } from '../../generated/prisma/enums';
import {
  HistorialEstadoOPModel,
  OrdenPagoModel,
} from '../../generated/prisma/models';
import {
  DatosActualizarOrdenPago,
  DatosCrearOrdenPago,
  FiltrosOrdenPago,
  IOrdenesPagoRepositorio,
  OrdenPagoDetalle,
  OrdenPagoExportable,
  OrdenPagoParaPago,
  PaginacionOrdenPago,
} from './interfaces/ordenes-pago-repositorio.interface';

// Estados que NO representan una OP vigente: se excluyen del Excel del listado.
const ESTADOS_FUERA_DE_EXPORTACION: EstadoOP[] = [
  EstadoOP.BORRADOR,
  EstadoOP.ANULADO,
];

function condicionSector(
  sectorId: FiltrosOrdenPago['sectorId'],
): string | { in: string[] } | undefined {
  if (Array.isArray(sectorId)) {
    return sectorId.length > 0 ? { in: sectorId } : undefined;
  }
  return sectorId;
}

@Injectable()
export class OrdenesPagoRepositorio implements IOrdenesPagoRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<OrdenPagoModel | null> {
    return this.prisma.ordenPago.findUnique({ where: { id } });
  }

  // OP con relaciones para el mail de notificación (proyecto + cliente, proveedor,
  // sector, solicitante y la OC de origen).
  async buscarDetalle(id: string): Promise<OrdenPagoDetalle | null> {
    return this.prisma.ordenPago.findUnique({
      where: { id },
      include: {
        proyecto: { include: { cliente: true } },
        proveedor: true,
        sector: true,
        solicitante: true,
        ordenCompra: true,
      },
    });
  }

  async buscarTodos(): Promise<OrdenPagoModel[]> {
    return this.prisma.ordenPago.findMany({ orderBy: { numero: 'desc' } });
  }

  // OPs en estado APROBADO (las "para pagar"), con todas las relaciones que
  // consume el Excel de pagos, en una sola query (sin N+1). Ordenadas por número
  // ascendente para que el archivo salga estable. Los campos escalares de la OP
  // (forma de pago, monto, moneda, concepto, etc.) vienen siempre, sin include.
  async buscarAprobadasParaPago(): Promise<OrdenPagoParaPago[]> {
    return this.prisma.ordenPago.findMany({
      where: { estado: EstadoOP.APROBADO },
      orderBy: { numero: 'asc' },
      include: {
        proveedor: true,
        sector: true,
        solicitante: true,
        proyecto: { include: { cliente: true } },
        ordenCompra: true,
        historialEstados: { include: { usuario: true } },
      },
    });
  }

  // OPs vigentes para el Excel del listado general, con sus relaciones en una
  // sola query. Mismo criterio que la exportación de OC: sin borradores ni
  // anuladas, de la más nueva a la más vieja.
  async buscarParaExportar(): Promise<OrdenPagoExportable[]> {
    return this.prisma.ordenPago.findMany({
      where: { estado: { notIn: ESTADOS_FUERA_DE_EXPORTACION } },
      orderBy: { numero: 'desc' },
      include: {
        proveedor: true,
        sector: true,
        solicitante: true,
        proyecto: { include: { cliente: true } },
        ordenCompra: true,
      },
    });
  }

  async crear(datos: DatosCrearOrdenPago): Promise<OrdenPagoModel> {
    return this.prisma.ordenPago.create({ data: datos });
  }

  async actualizar(
    id: string,
    datos: DatosActualizarOrdenPago,
  ): Promise<OrdenPagoModel> {
    return this.prisma.ordenPago.update({ where: { id }, data: datos });
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.ordenPago.delete({ where: { id } });
  }

  async sumarMontoPorCotizacion(cotizacionId: string): Promise<Prisma.Decimal> {
    const resultado = await this.prisma.ordenPago.aggregate({
      where: {
        cotizacionId,
        estado: { not: EstadoOP.ANULADO },
      },
      _sum: { monto: true },
    });

    return resultado._sum.monto ?? new Prisma.Decimal(0);
  }

  async modificarYReaprobar(
    id: string,
    datos: DatosActualizarOrdenPago,
    usuarioId: string,
  ): Promise<OrdenPagoModel | null> {
    return this.prisma.$transaction(async (tx) => {
      // Compare-and-swap: edita y reenvía a aprobación solo si la OP sigue
      // APROBADA. Si otra acción la movió, count = 0 y no se toca nada.
      const resultado = await tx.ordenPago.updateMany({
        where: { id, estado: EstadoOP.APROBADO },
        data: { ...datos, estado: EstadoOP.PENDIENTE },
      });

      if (resultado.count === 0) {
        return null;
      }

      await tx.historialEstadoOP.create({
        data: {
          ordenPagoId: id,
          estadoAnterior: EstadoOP.APROBADO,
          estadoNuevo: EstadoOP.PENDIENTE,
          usuarioId,
          motivo: 'Editada y reenviada a aprobación',
        },
      });

      return tx.ordenPago.findUniqueOrThrow({ where: { id } });
    });
  }

  async cambiarEstado(
    id: string,
    estadoAnterior: EstadoOP,
    estadoNuevo: EstadoOP,
    usuarioId: string,
    motivo?: string | null,
  ): Promise<OrdenPagoModel | null> {
    return this.prisma.$transaction(async (tx) => {
      // Compare-and-swap: el UPDATE solo aplica si la orden sigue en el
      // estado que ya se validó como punto de partida. Si otra transición
      // concurrente la cambió mientras tanto, `count` da 0 y no se escribe
      // nada — evita que dos transiciones casi simultáneas validen contra
      // el mismo estado viejo y una termine pisando a la otra.
      const resultado = await tx.ordenPago.updateMany({
        where: { id, estado: estadoAnterior },
        data: { estado: estadoNuevo },
      });

      if (resultado.count === 0) {
        return null;
      }

      await tx.historialEstadoOP.create({
        data: {
          ordenPagoId: id,
          estadoAnterior,
          estadoNuevo,
          usuarioId,
          motivo: motivo ?? null,
        },
      });

      return tx.ordenPago.findUniqueOrThrow({ where: { id } });
    });
  }

  async buscarHistorial(
    ordenPagoId: string,
  ): Promise<HistorialEstadoOPModel[]> {
    return this.prisma.historialEstadoOP.findMany({
      where: { ordenPagoId },
      orderBy: { creadoEn: 'asc' },
    });
  }

  async contarComentariosAsociados(ordenPagoId: string): Promise<number> {
    return this.prisma.comentario.count({ where: { ordenPagoId } });
  }

  async buscarConFiltros(
    filtros: FiltrosOrdenPago,
    paginacion: PaginacionOrdenPago,
  ): Promise<OrdenPagoModel[]> {
    return this.prisma.ordenPago.findMany({
      where: {
        proyectoId: filtros.proyectoId,
        cotizacionId: filtros.cotizacionId,
        ordenCompraId: filtros.ordenCompraId,
        estado: filtros.estado,
        sectorId: condicionSector(filtros.sectorId),
        solicitanteId: filtros.solicitanteId,
      },
      orderBy: { numero: 'desc' },
      skip: (paginacion.pagina - 1) * paginacion.porPagina,
      take: paginacion.porPagina,
    });
  }

  async contarConFiltros(filtros: FiltrosOrdenPago): Promise<number> {
    return this.prisma.ordenPago.count({
      where: {
        proyectoId: filtros.proyectoId,
        cotizacionId: filtros.cotizacionId,
        ordenCompraId: filtros.ordenCompraId,
        estado: filtros.estado,
        sectorId: condicionSector(filtros.sectorId),
        solicitanteId: filtros.solicitanteId,
      },
    });
  }
}
