import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { EstadoOC } from '../../generated/prisma/enums';
import { OrdenCompraModel } from '../../generated/prisma/models';
import {
  DatosActualizarOrdenCompra,
  DatosCrearOrdenCompra,
  IOrdenesCompraRepositorio,
} from './interfaces/ordenes-compra-repositorio.interface';

@Injectable()
export class OrdenesCompraRepositorio implements IOrdenesCompraRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<OrdenCompraModel | null> {
    return this.prisma.ordenCompra.findUnique({ where: { id } });
  }

  async buscarTodos(): Promise<OrdenCompraModel[]> {
    return this.prisma.ordenCompra.findMany({ orderBy: { numero: 'desc' } });
  }

  async crear(datos: DatosCrearOrdenCompra): Promise<OrdenCompraModel> {
    return this.prisma.ordenCompra.create({ data: datos });
  }

  async actualizar(
    id: string,
    datos: DatosActualizarOrdenCompra,
  ): Promise<OrdenCompraModel> {
    return this.prisma.ordenCompra.update({ where: { id }, data: datos });
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.ordenCompra.delete({ where: { id } });
  }

  async sumarMontoPorCotizacion(cotizacionId: string): Promise<Prisma.Decimal> {
    const resultado = await this.prisma.ordenCompra.aggregate({
      where: {
        cotizacionId,
        estado: { not: EstadoOC.ANULADO },
      },
      _sum: { monto: true },
    });

    return resultado._sum.monto ?? new Prisma.Decimal(0);
  }
}
