import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioModel } from '../../generated/prisma/models';
import {
  DatosActualizarUsuario,
  DatosCrearUsuario,
  IUsuariosRepositorio,
} from './interfaces/usuarios-repositorio.interface';

@Injectable()
export class UsuariosRepositorio implements IUsuariosRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<UsuarioModel | null> {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  async buscarPorEmail(email: string): Promise<UsuarioModel | null> {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  async buscarTodos(): Promise<UsuarioModel[]> {
    return this.prisma.usuario.findMany({ orderBy: { nombre: 'asc' } });
  }

  async crear(datos: DatosCrearUsuario): Promise<UsuarioModel> {
    return this.prisma.usuario.create({ data: datos });
  }

  async actualizar(
    id: string,
    datos: DatosActualizarUsuario,
  ): Promise<UsuarioModel> {
    return this.prisma.usuario.update({ where: { id }, data: datos });
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });
  }
}
