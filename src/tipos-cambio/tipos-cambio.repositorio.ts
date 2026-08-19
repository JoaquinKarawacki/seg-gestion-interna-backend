import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Moneda } from '../../generated/prisma/enums';
import { TipoCambioModel } from '../../generated/prisma/models';
import { ITiposCambioRepositorio } from './interfaces/tipos-cambio-repositorio.interface';

@Injectable()
export class TiposCambioRepositorio implements ITiposCambioRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarTodos(): Promise<TipoCambioModel[]> {
    return this.prisma.tipoCambio.findMany({ orderBy: { moneda: 'asc' } });
  }

  async actualizar(moneda: Moneda, valorEnUyu: number): Promise<TipoCambioModel> {
    return this.prisma.tipoCambio.upsert({
      where: { moneda },
      update: { valorEnUyu },
      create: { moneda, valorEnUyu },
    });
  }
}
