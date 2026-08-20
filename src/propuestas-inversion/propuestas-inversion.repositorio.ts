import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoCotizacion } from '../../generated/prisma/enums';
import { PropuestaInversionModel } from '../../generated/prisma/models';
import {
  DatosCrearPropuestaInversion,
  IPropuestasInversionRepositorio,
} from './interfaces/propuestas-inversion-repositorio.interface';

@Injectable()
export class PropuestasInversionRepositorio implements IPropuestasInversionRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<PropuestaInversionModel | null> {
    return this.prisma.propuestaInversion.findUnique({ where: { id } });
  }

  async buscarPorProyecto(
    proyectoId: string,
  ): Promise<PropuestaInversionModel[]> {
    return this.prisma.propuestaInversion.findMany({
      where: { proyectoId },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async buscarActivaPorProyecto(
    proyectoId: string,
  ): Promise<PropuestaInversionModel | null> {
    return this.prisma.propuestaInversion.findFirst({
      where: { proyectoId, estado: EstadoCotizacion.ACTIVA },
    });
  }

  async crearNuevaVersion(
    datos: DatosCrearPropuestaInversion,
  ): Promise<PropuestaInversionModel> {
    return this.prisma.$transaction(async (tx) => {
      await tx.propuestaInversion.updateMany({
        where: {
          proyectoId: datos.proyectoId,
          estado: EstadoCotizacion.ACTIVA,
        },
        data: { estado: EstadoCotizacion.REEMPLAZADA },
      });

      return tx.propuestaInversion.create({ data: datos });
    });
  }
}
