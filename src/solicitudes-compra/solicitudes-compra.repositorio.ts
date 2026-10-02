import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoSolicitudCompra } from '../../generated/prisma/enums';
import {
  HistorialEstadoSolicitudCompraModel,
  SolicitudCompraModel,
} from '../../generated/prisma/models';
import {
  DatosCrearSolicitudConCotizacion,
  FiltrosSolicitudCompra,
  ISolicitudesCompraRepositorio,
  PaginacionSolicitudCompra,
} from './interfaces/solicitudes-compra-repositorio.interface';

function condicionSector(
  sectorId: FiltrosSolicitudCompra['sectorId'],
): string | { in: string[] } | undefined {
  if (Array.isArray(sectorId)) {
    return sectorId.length > 0 ? { in: sectorId } : undefined;
  }
  return sectorId;
}

@Injectable()
export class SolicitudesCompraRepositorio implements ISolicitudesCompraRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<SolicitudCompraModel | null> {
    return this.prisma.solicitudCompra.findUnique({ where: { id } });
  }

  // Crea, en una sola transacción, la Tarea del rubro (reutilizándola si ya
  // existe en el proyecto), la Cotización independiente (1:1 con la OC) y la
  // Orden de Compra que las enlaza. El PDF ya se guardó fuera de la tx.
  async crearConCotizacionYTarea(
    datos: DatosCrearSolicitudConCotizacion,
  ): Promise<SolicitudCompraModel> {
    return this.prisma.$transaction(async (tx) => {
      const tareaExistente = await tx.tarea.findFirst({
        where: { proyectoId: datos.proyectoId, nombre: datos.rubroNombre },
      });

      const tarea =
        tareaExistente ??
        (await tx.tarea.create({
          data: { proyectoId: datos.proyectoId, nombre: datos.rubroNombre },
        }));

      const cotizacion = await tx.cotizacion.create({
        data: {
          proyectoId: datos.proyectoId,
          tareaId: tarea.id,
          proveedorId: datos.proveedorId,
          montoTotal: datos.monto,
          moneda: datos.moneda,
          ivaIncluido: datos.ivaIncluido,
          archivoPdfRuta: datos.archivoPdfRuta,
        },
      });

      return tx.solicitudCompra.create({
        data: {
          tipo: datos.tipo,
          solicitanteId: datos.solicitanteId,
          sectorId: datos.sectorId,
          proveedorId: datos.proveedorId,
          clienteId: datos.clienteId,
          proyectoId: datos.proyectoId,
          rubroId: datos.rubroId,
          tareaId: tarea.id,
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
    estadoAnterior: EstadoSolicitudCompra,
    estadoNuevo: EstadoSolicitudCompra,
    usuarioId: string,
    motivo?: string | null,
  ): Promise<SolicitudCompraModel | null> {
    return this.prisma.$transaction(async (tx) => {
      // Compare-and-swap: igual que en la OP, el UPDATE solo aplica si la OC
      // sigue en el estado validado como punto de partida.
      const resultado = await tx.solicitudCompra.updateMany({
        where: { id, estado: estadoAnterior },
        data: { estado: estadoNuevo },
      });

      if (resultado.count === 0) {
        return null;
      }

      await tx.historialEstadoSolicitudCompra.create({
        data: {
          solicitudCompraId: id,
          estadoAnterior,
          estadoNuevo,
          usuarioId,
          motivo: motivo ?? null,
        },
      });

      return tx.solicitudCompra.findUniqueOrThrow({ where: { id } });
    });
  }

  async buscarHistorial(
    solicitudCompraId: string,
  ): Promise<HistorialEstadoSolicitudCompraModel[]> {
    return this.prisma.historialEstadoSolicitudCompra.findMany({
      where: { solicitudCompraId },
      orderBy: { creadoEn: 'asc' },
    });
  }

  // Al borrar una OC en BORRADOR se borra también su Cotización (1:1, creada
  // por esta OC y aún sin Órdenes de Pago). La Tarea se conserva porque se
  // comparte entre OCs del mismo rubro.
  async eliminar(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const solicitud = await tx.solicitudCompra.findUniqueOrThrow({
        where: { id },
        select: { cotizacionId: true },
      });

      await tx.solicitudCompra.delete({ where: { id } });
      await tx.cotizacion.delete({ where: { id: solicitud.cotizacionId } });
    });
  }

  async buscarConFiltros(
    filtros: FiltrosSolicitudCompra,
    paginacion: PaginacionSolicitudCompra,
  ): Promise<SolicitudCompraModel[]> {
    return this.prisma.solicitudCompra.findMany({
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

  async contarConFiltros(filtros: FiltrosSolicitudCompra): Promise<number> {
    return this.prisma.solicitudCompra.count({
      where: {
        proyectoId: filtros.proyectoId,
        estado: filtros.estado,
        sectorId: condicionSector(filtros.sectorId),
        solicitanteId: filtros.solicitanteId,
      },
    });
  }
}
