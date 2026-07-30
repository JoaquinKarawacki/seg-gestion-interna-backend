import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TareaModel } from '../../generated/prisma/models';
import {
  DatosActualizarTarea,
  DatosCrearTarea,
  ITareasRepositorio,
} from './interfaces/tareas-repositorio.interface';

@Injectable()
export class TareasRepositorio implements ITareasRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<TareaModel | null> {
    return this.prisma.tarea.findUnique({ where: { id } });
  }

  async buscarTodos(): Promise<TareaModel[]> {
    return this.prisma.tarea.findMany({ orderBy: { nombre: 'asc' } });
  }

  async buscarPorProyecto(proyectoId: string): Promise<TareaModel[]> {
    return this.prisma.tarea.findMany({
      where: { proyectoId },
      orderBy: { nombre: 'asc' },
    });
  }

  async crear(datos: DatosCrearTarea): Promise<TareaModel> {
    return this.prisma.tarea.create({ data: datos });
  }

  async actualizar(
    id: string,
    datos: DatosActualizarTarea,
  ): Promise<TareaModel> {
    return this.prisma.tarea.update({ where: { id }, data: datos });
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.tarea.delete({ where: { id } });
  }

  async contarCotizacionesAsociadas(tareaId: string): Promise<number> {
    return this.prisma.cotizacion.count({ where: { tareaId } });
  }

  async contarOrdenesCompraAsociadas(tareaId: string): Promise<number> {
    return this.prisma.ordenCompra.count({ where: { tareaId } });
  }
}
