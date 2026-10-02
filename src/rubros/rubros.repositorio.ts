import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RubroModel } from '../../generated/prisma/models';
import {
  DatosActualizarRubro,
  DatosCrearRubro,
  IRubrosRepositorio,
} from './interfaces/rubros-repositorio.interface';

@Injectable()
export class RubrosRepositorio implements IRubrosRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<RubroModel | null> {
    return this.prisma.rubro.findUnique({ where: { id } });
  }

  async buscarTodos(): Promise<RubroModel[]> {
    return this.prisma.rubro.findMany({ orderBy: { nombre: 'asc' } });
  }

  async buscarPorNombre(nombre: string): Promise<RubroModel | null> {
    return this.prisma.rubro.findUnique({ where: { nombre } });
  }

  async crear(datos: DatosCrearRubro): Promise<RubroModel> {
    return this.prisma.rubro.create({ data: datos });
  }

  async actualizar(
    id: string,
    datos: DatosActualizarRubro,
  ): Promise<RubroModel> {
    return this.prisma.rubro.update({ where: { id }, data: datos });
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.rubro.delete({ where: { id } });
  }

  async contarSolicitudesAsociadas(rubroId: string): Promise<number> {
    return this.prisma.ordenCompra.count({ where: { rubroId } });
  }
}
