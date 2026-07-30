import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { SectorModel } from '../../generated/prisma/models';
import { ActualizarSectorDto } from './dtos/actualizar-sector.dto';
import { CrearSectorDto } from './dtos/crear-sector.dto';
import { RespuestaSectorDto } from './dtos/respuesta-sector.dto';
import { SECTORES_REPOSITORIO } from './interfaces/sectores-repositorio.interface';
import type { ISectoresRepositorio } from './interfaces/sectores-repositorio.interface';

const CODIGO_RESTRICCION_UNICA = 'P2002';

@Injectable()
export class SectoresService {
  constructor(
    @Inject(SECTORES_REPOSITORIO)
    private readonly sectoresRepositorio: ISectoresRepositorio,
  ) {}

  async listar(): Promise<RespuestaSectorDto[]> {
    const sectores = await this.sectoresRepositorio.buscarTodos();
    return sectores.map((sector) => this.mapearRespuesta(sector));
  }

  async buscarPorId(id: string): Promise<RespuestaSectorDto> {
    const sector = await this.obtenerSectorOFallar(id);
    return this.mapearRespuesta(sector);
  }

  async crear(dto: CrearSectorDto): Promise<RespuestaSectorDto> {
    const sector = await this.ejecutarOMapearConflicto(() =>
      this.sectoresRepositorio.crear(dto),
    );

    return this.mapearRespuesta(sector);
  }

  async actualizar(
    id: string,
    dto: ActualizarSectorDto,
  ): Promise<RespuestaSectorDto> {
    await this.obtenerSectorOFallar(id);

    const sector = await this.ejecutarOMapearConflicto(() =>
      this.sectoresRepositorio.actualizar(id, dto),
    );

    return this.mapearRespuesta(sector);
  }

  async eliminar(id: string): Promise<void> {
    await this.obtenerSectorOFallar(id);

    const [usuariosAsignados, ordenesCompraAsociadas] = await Promise.all([
      this.sectoresRepositorio.contarUsuariosAsignados(id),
      this.sectoresRepositorio.contarOrdenesCompraAsociadas(id),
    ]);

    if (usuariosAsignados > 0) {
      throw new UnprocessableEntityException({
        error: 'SECTOR_CON_USUARIOS_ASIGNADOS',
        mensaje:
          'No se puede eliminar el sector porque tiene usuarios asignados',
      });
    }

    if (ordenesCompraAsociadas > 0) {
      throw new UnprocessableEntityException({
        error: 'SECTOR_CON_ORDENES_COMPRA_ASOCIADAS',
        mensaje:
          'No se puede eliminar el sector porque tiene órdenes de compra asociadas',
      });
    }

    await this.sectoresRepositorio.eliminar(id);
  }

  private async obtenerSectorOFallar(id: string): Promise<SectorModel> {
    const sector = await this.sectoresRepositorio.buscarPorId(id);

    if (!sector) {
      throw new NotFoundException({
        error: 'SECTOR_NO_ENCONTRADO',
        mensaje: 'No existe un sector con ese ID',
      });
    }

    return sector;
  }

  private async ejecutarOMapearConflicto(
    operacion: () => Promise<SectorModel>,
  ): Promise<SectorModel> {
    try {
      return await operacion();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === CODIGO_RESTRICCION_UNICA
      ) {
        throw new ConflictException({
          error: 'SECTOR_YA_EXISTE',
          mensaje: 'Ya existe un sector con ese nombre',
        });
      }

      throw error;
    }
  }

  private mapearRespuesta(sector: SectorModel): RespuestaSectorDto {
    return {
      id: sector.id,
      nombre: sector.nombre,
    };
  }
}
