import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoOP } from '../../generated/prisma/enums';
import { CotizacionModel } from '../../generated/prisma/models';
import {
  CotizacionConRelaciones,
  CotizacionExportable,
  ICotizacionesRepositorio,
} from './interfaces/cotizaciones-repositorio.interface';

@Injectable()
export class CotizacionesRepositorio implements ICotizacionesRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<CotizacionModel | null> {
    return this.prisma.cotizacion.findUnique({ where: { id } });
  }

  async buscarPorProyecto(proyectoId: string): Promise<CotizacionModel[]> {
    return this.prisma.cotizacion.findMany({
      where: { proyectoId },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async buscarTodasParaBusqueda(): Promise<CotizacionConRelaciones[]> {
    return this.prisma.cotizacion.findMany({
      orderBy: { creadoEn: 'desc' },
      include: {
        proyecto: { select: { nombre: true } },
        proveedor: { select: { nombre: true } },
      },
    });
  }

  // Todas las cotizaciones para el Excel del listado, en una sola query. Las OP
  // se filtran a las no anuladas: mismo criterio que
  // OrdenesPagoRepositorio.sumarMontoPorCotizacion para "lo comprometido".
  async buscarParaExportar(): Promise<CotizacionExportable[]> {
    return this.prisma.cotizacion.findMany({
      orderBy: { creadoEn: 'desc' },
      include: {
        proyecto: { include: { cliente: true } },
        proveedor: true,
        ordenCompra: { include: { sector: true } },
        ordenesPago: {
          where: { estado: { not: EstadoOP.ANULADO } },
          select: { monto: true },
        },
      },
    });
  }
}
