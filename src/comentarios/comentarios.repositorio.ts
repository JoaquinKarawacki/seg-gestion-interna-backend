import { Injectable } from '@nestjs/common';
import { ComentarioModel } from '../../generated/prisma/models';
import { PrismaService } from '../prisma/prisma.service';
import {
  DatosCrearComentario,
  IComentariosRepositorio,
} from './interfaces/comentarios-repositorio.interface';

@Injectable()
export class ComentariosRepositorio implements IComentariosRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async crear(datos: DatosCrearComentario): Promise<ComentarioModel> {
    return this.prisma.comentario.create({ data: datos });
  }

  async buscarPorOrden(ordenCompraId: string): Promise<ComentarioModel[]> {
    return this.prisma.comentario.findMany({
      where: { ordenCompraId },
      orderBy: { creadoEn: 'asc' },
    });
  }
}
