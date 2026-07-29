import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProyectoModel } from '../../generated/prisma/models';
import {
  DatosActualizarProyecto,
  DatosCrearProyecto,
  IProyectosRepositorio,
} from './interfaces/proyectos-repositorio.interface';

@Injectable()
export class ProyectosRepositorio implements IProyectosRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<ProyectoModel | null> {
    return this.prisma.proyecto.findUnique({ where: { id } });
  }

  async buscarTodos(): Promise<ProyectoModel[]> {
    return this.prisma.proyecto.findMany({ orderBy: { nombre: 'asc' } });
  }

  async crear(datos: DatosCrearProyecto): Promise<ProyectoModel> {
    return this.prisma.proyecto.create({ data: datos });
  }

  async actualizar(
    id: string,
    datos: DatosActualizarProyecto,
  ): Promise<ProyectoModel> {
    return this.prisma.proyecto.update({ where: { id }, data: datos });
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.proyecto.delete({ where: { id } });
  }

  async contarCotizacionesAsociadas(proyectoId: string): Promise<number> {
    return this.prisma.cotizacion.count({ where: { proyectoId } });
  }
}
