import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SectorModel } from '../../generated/prisma/models';
import {
  DatosActualizarSector,
  DatosCrearSector,
  ISectoresRepositorio,
} from './interfaces/sectores-repositorio.interface';

@Injectable()
export class SectoresRepositorio implements ISectoresRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<SectorModel | null> {
    return this.prisma.sector.findUnique({ where: { id } });
  }

  async buscarTodos(): Promise<SectorModel[]> {
    return this.prisma.sector.findMany({ orderBy: { nombre: 'asc' } });
  }

  async crear(datos: DatosCrearSector): Promise<SectorModel> {
    return this.prisma.sector.create({ data: datos });
  }

  async actualizar(
    id: string,
    datos: DatosActualizarSector,
  ): Promise<SectorModel> {
    return this.prisma.sector.update({ where: { id }, data: datos });
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.sector.delete({ where: { id } });
  }

  async contarUsuariosAsignados(sectorId: string): Promise<number> {
    return this.prisma.usuario.count({ where: { sectorId } });
  }
}
