import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClienteModel } from '../../generated/prisma/models';
import {
  DatosActualizarCliente,
  DatosCrearCliente,
  IClientesRepositorio,
} from './interfaces/clientes-repositorio.interface';

@Injectable()
export class ClientesRepositorio implements IClientesRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<ClienteModel | null> {
    return this.prisma.cliente.findUnique({ where: { id } });
  }

  async buscarTodos(): Promise<ClienteModel[]> {
    return this.prisma.cliente.findMany({ orderBy: { nombre: 'asc' } });
  }

  async crear(datos: DatosCrearCliente): Promise<ClienteModel> {
    return this.prisma.cliente.create({ data: datos });
  }

  async actualizar(
    id: string,
    datos: DatosActualizarCliente,
  ): Promise<ClienteModel> {
    return this.prisma.cliente.update({ where: { id }, data: datos });
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.cliente.delete({ where: { id } });
  }

  async contarProyectosAsociados(clienteId: string): Promise<number> {
    return this.prisma.proyecto.count({ where: { clienteId } });
  }
}
