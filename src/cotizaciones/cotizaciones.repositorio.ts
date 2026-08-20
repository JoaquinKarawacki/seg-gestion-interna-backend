import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoCotizacion } from '../../generated/prisma/enums';
import { CotizacionModel } from '../../generated/prisma/models';
import {
  DatosCrearCotizacion,
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

  async buscarPorTarea(tareaId: string): Promise<CotizacionModel[]> {
    return this.prisma.cotizacion.findMany({
      where: { tareaId },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async buscarActivaPorTarea(tareaId: string): Promise<CotizacionModel | null> {
    return this.prisma.cotizacion.findFirst({
      where: { tareaId, estado: EstadoCotizacion.ACTIVA },
    });
  }

  async crearNuevaVersion(
    datos: DatosCrearCotizacion,
  ): Promise<CotizacionModel> {
    return this.prisma.$transaction(async (tx) => {
      await tx.cotizacion.updateMany({
        where: {
          proyectoId: datos.proyectoId,
          tareaId: datos.tareaId,
          estado: EstadoCotizacion.ACTIVA,
        },
        data: { estado: EstadoCotizacion.REEMPLAZADA },
      });

      return tx.cotizacion.create({ data: datos });
    });
  }
}
