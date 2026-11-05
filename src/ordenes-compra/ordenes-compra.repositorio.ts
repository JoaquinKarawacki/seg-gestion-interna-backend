import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoOC } from '../../generated/prisma/enums';
import {
  HistorialEstadoOCModel,
  OrdenCompraModel,
} from '../../generated/prisma/models';
import {
  DatosCrearOrdenCompra,
  FiltrosOrdenCompra,
  IOrdenesCompraRepositorio,
  OrdenCompraDetalle,
  PaginacionOrdenCompra,
} from './interfaces/ordenes-compra-repositorio.interface';

function condicionSector(
  sectorId: FiltrosOrdenCompra['sectorId'],
): string | { in: string[] } | undefined {
  if (Array.isArray(sectorId)) {
    return sectorId.length > 0 ? { in: sectorId } : undefined;
  }
  return sectorId;
}

@Injectable()
export class OrdenesCompraRepositorio implements IOrdenesCompraRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<OrdenCompraModel | null> {
    return this.prisma.ordenCompra.findUnique({ where: { id } });
  }

  // OC con relaciones para el mail de notificación (proyecto + cliente, proveedor,
  // sector y solicitante). `proyecto` viene null en las categorías sin proyecto.
  async buscarDetalle(id: string): Promise<OrdenCompraDetalle | null> {
    return this.prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        proyecto: { include: { cliente: true } },
        proveedor: true,
        sector: true,
        solicitante: true,
      },
    });
  }

  // Crea, en una sola transacción, la Cotización (1:1 con la OC) y la Orden de
  // Compra que la enlaza. Sin Tarea intermedia. `proyectoId`/`clienteId` vienen
  // null en las categorías sin proyecto; `archivoPdfRuta` null si no hubo PDF.
  // El PDF, si vino, ya se guardó fuera de la tx.
  async crearConCotizacion(
    datos: DatosCrearOrdenCompra,
  ): Promise<OrdenCompraModel> {
    return this.prisma.$transaction(async (tx) => {
      const cotizacion = await tx.cotizacion.create({
        data: {
          proyectoId: datos.proyectoId,
          proveedorId: datos.proveedorId,
          montoTotal: datos.monto,
          moneda: datos.moneda,
          ivaIncluido: datos.ivaIncluido,
          archivoPdfRuta: datos.archivoPdfRuta,
        },
      });

      return tx.ordenCompra.create({
        data: {
          categoria: datos.categoria,
          tipo: datos.tipo,
          solicitanteId: datos.solicitanteId,
          sectorId: datos.sectorId,
          proveedorId: datos.proveedorId,
          clienteId: datos.clienteId,
          proyectoId: datos.proyectoId,
          cotizacionId: cotizacion.id,
          moneda: datos.moneda,
          monto: datos.monto,
          concepto: datos.concepto,
          pagaIva: datos.pagaIva,
          ivaIncluido: datos.ivaIncluido,
          observaciones: datos.observaciones,
          archivoPdfRuta: datos.archivoPdfRuta,
          esPagoUnico: datos.esPagoUnico,
          pagoUnicoFormaPago: datos.pagoUnicoFormaPago,
        },
      });
    });
  }

  async cambiarEstado(
    id: string,
    estadoAnterior: EstadoOC,
    estadoNuevo: EstadoOC,
    usuarioId: string,
    motivo?: string | null,
  ): Promise<OrdenCompraModel | null> {
    return this.prisma.$transaction(async (tx) => {
      // Compare-and-swap: igual que en la OP, el UPDATE solo aplica si la OC
      // sigue en el estado validado como punto de partida.
      const resultado = await tx.ordenCompra.updateMany({
        where: { id, estado: estadoAnterior },
        data: { estado: estadoNuevo },
      });

      if (resultado.count === 0) {
        return null;
      }

      await tx.historialEstadoOC.create({
        data: {
          ordenCompraId: id,
          estadoAnterior,
          estadoNuevo,
          usuarioId,
          motivo: motivo ?? null,
        },
      });

      return tx.ordenCompra.findUniqueOrThrow({ where: { id } });
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

  // Al borrar una OC en BORRADOR se borra también su Cotización, si tiene (1:1,
  // creada por esta OC y aún sin Órdenes de Pago). Las OC sin proyecto no tienen
  // cotización. La Tarea se conserva porque se comparte entre OCs del proyecto.
  async eliminar(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const solicitud = await tx.ordenCompra.findUniqueOrThrow({
        where: { id },
        select: { cotizacionId: true },
      });

      await tx.ordenCompra.delete({ where: { id } });

      if (solicitud.cotizacionId) {
        await tx.cotizacion.delete({ where: { id: solicitud.cotizacionId } });
      }
    });
  }

  async buscarConFiltros(
    filtros: FiltrosOrdenCompra,
    paginacion: PaginacionOrdenCompra,
  ): Promise<OrdenCompraModel[]> {
    return this.prisma.ordenCompra.findMany({
      where: {
        proyectoId: filtros.proyectoId,
        estado: filtros.estado,
        sectorId: condicionSector(filtros.sectorId),
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
        estado: filtros.estado,
        sectorId: condicionSector(filtros.sectorId),
        solicitanteId: filtros.solicitanteId,
      },
    });
  }
}
