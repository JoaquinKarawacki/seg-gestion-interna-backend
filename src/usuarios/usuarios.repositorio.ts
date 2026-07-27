import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioModel } from '../../generated/prisma/models';
import { IUsuariosRepositorio } from './interfaces/usuarios-repositorio.interface';

@Injectable()
export class UsuariosRepositorio implements IUsuariosRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<UsuarioModel | null> {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  async buscarPorEmail(email: string): Promise<UsuarioModel | null> {
    return this.prisma.usuario.findUnique({ where: { email } });
  }
}
