import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CotizacionModel } from '../../generated/prisma/models';
import {
  CotizacionConRelaciones,
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
}
