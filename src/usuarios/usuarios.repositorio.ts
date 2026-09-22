import { Injectable } from '@nestjs/common';
import { RolUsuario } from '../../generated/prisma/enums';
import { UsuarioModel } from '../../generated/prisma/models';
import { PrismaService } from '../prisma/prisma.service';
import {
  DatosActualizarUsuario,
  DatosCrearUsuario,
  IUsuariosRepositorio,
  UsuarioConSectoresEncargado,
} from './interfaces/usuarios-repositorio.interface';

const INCLUIR_SECTORES_ENCARGADO = {
  sectoresEncargado: { select: { id: true } },
} as const;

@Injectable()
export class UsuariosRepositorio implements IUsuariosRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<UsuarioConSectoresEncargado | null> {
    return this.prisma.usuario.findUnique({
      where: { id },
      include: INCLUIR_SECTORES_ENCARGADO,
    });
  }

  async buscarPorEmail(
    email: string,
  ): Promise<UsuarioConSectoresEncargado | null> {
    return this.prisma.usuario.findUnique({
      where: { email },
      include: INCLUIR_SECTORES_ENCARGADO,
    });
  }

  async buscarTodos(): Promise<UsuarioConSectoresEncargado[]> {
    return this.prisma.usuario.findMany({
      orderBy: { nombre: 'asc' },
      include: INCLUIR_SECTORES_ENCARGADO,
    });
  }

  async buscarActivosPorRol(
    rol: RolUsuario,
    sectorId?: string,
  ): Promise<UsuarioModel[]> {
    return this.prisma.usuario.findMany({
      where: {
        rol,
        activo: true,
        ...(sectorId ? { sectoresEncargado: { some: { id: sectorId } } } : {}),
      },
    });
  }

  async crear(datos: DatosCrearUsuario): Promise<UsuarioConSectoresEncargado> {
    const { sectoresEncargadoIds, ...resto } = datos;
    return this.prisma.usuario.create({
      data: {
        ...resto,
        sectoresEncargado: sectoresEncargadoIds
          ? { connect: sectoresEncargadoIds.map((id) => ({ id })) }
          : undefined,
      },
      include: INCLUIR_SECTORES_ENCARGADO,
    });
  }

  async actualizar(
    id: string,
    datos: DatosActualizarUsuario,
  ): Promise<UsuarioConSectoresEncargado> {
    const { sectoresEncargadoIds, ...resto } = datos;
    return this.prisma.usuario.update({
      where: { id },
      data: {
        ...resto,
        sectoresEncargado: sectoresEncargadoIds
          ? { set: sectoresEncargadoIds.map((id) => ({ id })) }
          : undefined,
      },
      include: INCLUIR_SECTORES_ENCARGADO,
    });
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });
  }
}
