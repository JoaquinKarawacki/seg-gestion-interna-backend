import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { ProveedorModel } from '../../generated/prisma/models';
import { ActualizarProveedorDto } from './dtos/actualizar-proveedor.dto';
import { CrearProveedorDto } from './dtos/crear-proveedor.dto';
import { RespuestaProveedorDto } from './dtos/respuesta-proveedor.dto';
import { PROVEEDORES_REPOSITORIO } from './interfaces/proveedores-repositorio.interface';
import type { IProveedoresRepositorio } from './interfaces/proveedores-repositorio.interface';

const CODIGO_RESTRICCION_UNICA = 'P2002';

@Injectable()
export class ProveedoresService {
  constructor(
    @Inject(PROVEEDORES_REPOSITORIO)
    private readonly proveedoresRepositorio: IProveedoresRepositorio,
  ) {}

  async listar(): Promise<RespuestaProveedorDto[]> {
    const proveedores = await this.proveedoresRepositorio.buscarTodos();
    return proveedores.map((proveedor) => this.mapearRespuesta(proveedor));
  }

  async buscarPorId(id: string): Promise<RespuestaProveedorDto> {
    const proveedor = await this.obtenerProveedorOFallar(id);
    return this.mapearRespuesta(proveedor);
  }

  async crear(dto: CrearProveedorDto): Promise<RespuestaProveedorDto> {
    const proveedor = await this.ejecutarOMapearConflicto(() =>
      this.proveedoresRepositorio.crear(dto),
    );

    return this.mapearRespuesta(proveedor);
  }

  async actualizar(
    id: string,
    dto: ActualizarProveedorDto,
  ): Promise<RespuestaProveedorDto> {
    await this.obtenerProveedorOFallar(id);

    const proveedor = await this.ejecutarOMapearConflicto(() =>
      this.proveedoresRepositorio.actualizar(id, dto),
    );

    return this.mapearRespuesta(proveedor);
  }

  async eliminar(id: string): Promise<void> {
    await this.obtenerProveedorOFallar(id);

    const [cotizacionesAsociadas, ordenesCompraAsociadas] = await Promise.all([
      this.proveedoresRepositorio.contarCotizacionesAsociadas(id),
      this.proveedoresRepositorio.contarOrdenesCompraAsociadas(id),
    ]);

    if (cotizacionesAsociadas > 0) {
      throw new UnprocessableEntityException({
        error: 'PROVEEDOR_CON_COTIZACIONES_ASOCIADAS',
        mensaje:
          'No se puede eliminar el proveedor porque tiene cotizaciones asociadas',
      });
    }

    if (ordenesCompraAsociadas > 0) {
      throw new UnprocessableEntityException({
        error: 'PROVEEDOR_CON_ORDENES_COMPRA_ASOCIADAS',
        mensaje:
          'No se puede eliminar el proveedor porque tiene órdenes de compra asociadas',
      });
    }

    await this.proveedoresRepositorio.eliminar(id);
  }

  private async obtenerProveedorOFallar(id: string): Promise<ProveedorModel> {
    const proveedor = await this.proveedoresRepositorio.buscarPorId(id);

    if (!proveedor) {
      throw new NotFoundException({
        error: 'PROVEEDOR_NO_ENCONTRADO',
        mensaje: 'No existe un proveedor con ese ID',
      });
    }

    return proveedor;
  }

  private async ejecutarOMapearConflicto(
    operacion: () => Promise<ProveedorModel>,
  ): Promise<ProveedorModel> {
    try {
      return await operacion();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === CODIGO_RESTRICCION_UNICA
      ) {
        throw new ConflictException({
          error: 'PROVEEDOR_YA_EXISTE',
          mensaje: 'Ya existe un proveedor con ese RUT',
        });
      }

      throw error;
    }
  }

  private mapearRespuesta(proveedor: ProveedorModel): RespuestaProveedorDto {
    return {
      id: proveedor.id,
      nombre: proveedor.nombre,
      rut: proveedor.rut,
      email: proveedor.email,
      telefono: proveedor.telefono,
      banco: proveedor.banco,
      tipoCuenta: proveedor.tipoCuenta,
      numeroCuenta: proveedor.numeroCuenta,
    };
  }
}
