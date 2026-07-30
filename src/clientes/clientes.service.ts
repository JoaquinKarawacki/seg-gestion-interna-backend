import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { ClienteModel } from '../../generated/prisma/models';
import { ActualizarClienteDto } from './dtos/actualizar-cliente.dto';
import { CrearClienteDto } from './dtos/crear-cliente.dto';
import { RespuestaClienteDto } from './dtos/respuesta-cliente.dto';
import { CLIENTES_REPOSITORIO } from './interfaces/clientes-repositorio.interface';
import type { IClientesRepositorio } from './interfaces/clientes-repositorio.interface';

const CODIGO_RESTRICCION_UNICA = 'P2002';

@Injectable()
export class ClientesService {
  constructor(
    @Inject(CLIENTES_REPOSITORIO)
    private readonly clientesRepositorio: IClientesRepositorio,
  ) {}

  async listar(): Promise<RespuestaClienteDto[]> {
    const clientes = await this.clientesRepositorio.buscarTodos();
    return clientes.map((cliente) => this.mapearRespuesta(cliente));
  }

  async buscarPorId(id: string): Promise<RespuestaClienteDto> {
    const cliente = await this.obtenerClienteOFallar(id);
    return this.mapearRespuesta(cliente);
  }

  async crear(dto: CrearClienteDto): Promise<RespuestaClienteDto> {
    const cliente = await this.ejecutarOMapearConflicto(() =>
      this.clientesRepositorio.crear(dto),
    );

    return this.mapearRespuesta(cliente);
  }

  async actualizar(
    id: string,
    dto: ActualizarClienteDto,
  ): Promise<RespuestaClienteDto> {
    await this.obtenerClienteOFallar(id);

    const cliente = await this.ejecutarOMapearConflicto(() =>
      this.clientesRepositorio.actualizar(id, dto),
    );

    return this.mapearRespuesta(cliente);
  }

  async eliminar(id: string): Promise<void> {
    await this.obtenerClienteOFallar(id);

    const [proyectosAsociados, ordenesCompraAsociadas] = await Promise.all([
      this.clientesRepositorio.contarProyectosAsociados(id),
      this.clientesRepositorio.contarOrdenesCompraAsociadas(id),
    ]);

    if (proyectosAsociados > 0) {
      throw new UnprocessableEntityException({
        error: 'CLIENTE_CON_PROYECTOS_ASOCIADOS',
        mensaje:
          'No se puede eliminar el cliente porque tiene proyectos asociados',
      });
    }

    if (ordenesCompraAsociadas > 0) {
      throw new UnprocessableEntityException({
        error: 'CLIENTE_CON_ORDENES_COMPRA_ASOCIADAS',
        mensaje:
          'No se puede eliminar el cliente porque tiene órdenes de compra asociadas',
      });
    }

    await this.clientesRepositorio.eliminar(id);
  }

  private async obtenerClienteOFallar(id: string): Promise<ClienteModel> {
    const cliente = await this.clientesRepositorio.buscarPorId(id);

    if (!cliente) {
      throw new NotFoundException({
        error: 'CLIENTE_NO_ENCONTRADO',
        mensaje: 'No existe un cliente con ese ID',
      });
    }

    return cliente;
  }

  private async ejecutarOMapearConflicto(
    operacion: () => Promise<ClienteModel>,
  ): Promise<ClienteModel> {
    try {
      return await operacion();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === CODIGO_RESTRICCION_UNICA
      ) {
        throw new ConflictException({
          error: 'CLIENTE_YA_EXISTE',
          mensaje: 'Ya existe un cliente con ese RUT',
        });
      }

      throw error;
    }
  }

  private mapearRespuesta(cliente: ClienteModel): RespuestaClienteDto {
    return {
      id: cliente.id,
      nombre: cliente.nombre,
      rut: cliente.rut,
      email: cliente.email,
      telefono: cliente.telefono,
    };
  }
}
