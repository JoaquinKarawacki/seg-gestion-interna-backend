import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProveedorModel } from '../../generated/prisma/models';
import {
  DatosActualizarProveedor,
  DatosCrearProveedor,
  IProveedoresRepositorio,
} from './interfaces/proveedores-repositorio.interface';

@Injectable()
export class ProveedoresRepositorio implements IProveedoresRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<ProveedorModel | null> {
    return this.prisma.proveedor.findUnique({ where: { id } });
  }

  async buscarTodos(): Promise<ProveedorModel[]> {
    return this.prisma.proveedor.findMany({ orderBy: { nombre: 'asc' } });
  }

  async crear(datos: DatosCrearProveedor): Promise<ProveedorModel> {
    return this.prisma.proveedor.create({ data: datos });
  }

  async actualizar(
    id: string,
    datos: DatosActualizarProveedor,
  ): Promise<ProveedorModel> {
    return this.prisma.proveedor.update({ where: { id }, data: datos });
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.proveedor.delete({ where: { id } });
  }

  async contarCotizacionesAsociadas(proveedorId: string): Promise<number> {
    return this.prisma.cotizacion.count({ where: { proveedorId } });
  }

  async contarOrdenesCompraAsociadas(proveedorId: string): Promise<number> {
    return this.prisma.ordenCompra.count({ where: { proveedorId } });
  }
}
