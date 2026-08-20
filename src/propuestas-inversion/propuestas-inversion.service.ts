import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { PropuestaInversionModel } from '../../generated/prisma/models';
import { ALMACENAMIENTO } from '../almacenamiento/puertos/almacenamiento.puerto';
import type {
  ArchivoAlmacenado,
  IAlmacenamiento,
} from '../almacenamiento/puertos/almacenamiento.puerto';
import { ACCIONES_AUDITORIA } from '../auditoria/acciones-auditoria.constantes';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import { CrearPropuestaInversionDto } from './dtos/crear-propuesta-inversion.dto';
import { RespuestaPropuestaInversionDto } from './dtos/respuesta-propuesta-inversion.dto';
import { PROPUESTAS_INVERSION_REPOSITORIO } from './interfaces/propuestas-inversion-repositorio.interface';
import type { IPropuestasInversionRepositorio } from './interfaces/propuestas-inversion-repositorio.interface';

const CODIGO_REFERENCIA_INVALIDA = 'P2003';
const CARPETA_ARCHIVOS = 'propuestas-inversion';
const MIME_TYPE_POR_DEFECTO = 'application/octet-stream';

export interface ArchivoDescargado {
  buffer: Buffer;
  mimeType: string;
  nombreArchivo: string;
}

@Injectable()
export class PropuestasInversionService {
  constructor(
    @Inject(PROPUESTAS_INVERSION_REPOSITORIO)
    private readonly propuestasInversionRepositorio: IPropuestasInversionRepositorio,
    @Inject(ALMACENAMIENTO)
    private readonly almacenamiento: IAlmacenamiento,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async buscarPorId(id: string): Promise<RespuestaPropuestaInversionDto> {
    const propuesta = await this.obtenerPropuestaOFallar(id);
    return this.mapearRespuesta(propuesta);
  }

  async listarPorProyecto(
    proyectoId: string,
  ): Promise<RespuestaPropuestaInversionDto[]> {
    const propuestas =
      await this.propuestasInversionRepositorio.buscarPorProyecto(proyectoId);
    return propuestas.map((propuesta) => this.mapearRespuesta(propuesta));
  }

  async buscarActivaPorProyecto(
    proyectoId: string,
  ): Promise<RespuestaPropuestaInversionDto> {
    const propuesta =
      await this.propuestasInversionRepositorio.buscarActivaPorProyecto(
        proyectoId,
      );

    if (!propuesta) {
      throw new NotFoundException({
        error: 'PROPUESTA_INVERSION_ACTIVA_NO_ENCONTRADA',
        mensaje: 'El proyecto no tiene una propuesta de inversión activa',
      });
    }

    return this.mapearRespuesta(propuesta);
  }

  async crear(
    dto: CrearPropuestaInversionDto,
    usuarioActual: UsuarioAutenticado,
    archivo?: Express.Multer.File,
  ): Promise<RespuestaPropuestaInversionDto> {
    const archivoGuardado = archivo
      ? await this.almacenamiento.guardar(
          archivo.buffer,
          archivo.originalname,
          CARPETA_ARCHIVOS,
        )
      : null;

    try {
      const propuesta = await this.ejecutarOMapearReferenciaInvalida(() =>
        this.propuestasInversionRepositorio.crearNuevaVersion({
          proyectoId: dto.proyectoId,
          costoTotalAproximado: new Prisma.Decimal(dto.costoTotalAproximado),
          ahorroMensual: new Prisma.Decimal(dto.ahorroMensual),
          cantidadMeses: dto.cantidadMeses,
          porcentajeSeg: new Prisma.Decimal(dto.porcentajeSeg),
          moneda: dto.moneda,
          archivoRuta: archivoGuardado?.referencia ?? null,
          archivoMimeType: archivo?.mimetype ?? null,
          archivoNombreOriginal: archivo?.originalname ?? null,
        }),
      );

      await this.auditoriaService.registrar({
        usuarioId: usuarioActual.id,
        usuarioEmail: usuarioActual.email,
        accion: ACCIONES_AUDITORIA.CREAR_PROPUESTA_INVERSION,
        descripcion: `Creó una propuesta de inversión de ${propuesta.costoTotalAproximado.toString()} ${propuesta.moneda} para el proyecto ${propuesta.proyectoId}`,
        entidad: 'PropuestaInversion',
        entidadId: propuesta.id,
      });

      return this.mapearRespuesta(propuesta);
    } catch (error) {
      await this.revertirArchivoGuardado(archivoGuardado);
      throw error;
    }
  }

  async descargarArchivo(id: string): Promise<ArchivoDescargado> {
    const propuesta = await this.obtenerPropuestaOFallar(id);

    if (!propuesta.archivoRuta) {
      throw new NotFoundException({
        error: 'PROPUESTA_INVERSION_SIN_ARCHIVO',
        mensaje: 'Esta propuesta de inversión no tiene un archivo adjunto',
      });
    }

    const buffer = await this.almacenamiento.leer(propuesta.archivoRuta);
    return {
      buffer,
      mimeType: propuesta.archivoMimeType ?? MIME_TYPE_POR_DEFECTO,
      nombreArchivo:
        propuesta.archivoNombreOriginal ??
        `propuesta-inversion-${propuesta.id}`,
    };
  }

  private async obtenerPropuestaOFallar(
    id: string,
  ): Promise<PropuestaInversionModel> {
    const propuesta = await this.propuestasInversionRepositorio.buscarPorId(id);

    if (!propuesta) {
      throw new NotFoundException({
        error: 'PROPUESTA_INVERSION_NO_ENCONTRADA',
        mensaje: 'No existe una propuesta de inversión con ese ID',
      });
    }

    return propuesta;
  }

  private async revertirArchivoGuardado(
    archivoGuardado: ArchivoAlmacenado | null,
  ): Promise<void> {
    if (archivoGuardado) {
      await this.almacenamiento.eliminar(archivoGuardado.referencia);
    }
  }

  private async ejecutarOMapearReferenciaInvalida(
    operacion: () => Promise<PropuestaInversionModel>,
  ): Promise<PropuestaInversionModel> {
    try {
      return await operacion();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === CODIGO_REFERENCIA_INVALIDA
      ) {
        throw new NotFoundException({
          error: 'PROYECTO_NO_ENCONTRADO',
          mensaje: 'El proyecto indicado no existe',
        });
      }

      throw error;
    }
  }

  private mapearRespuesta(
    propuesta: PropuestaInversionModel,
  ): RespuestaPropuestaInversionDto {
    const honorarios = propuesta.ahorroMensual
      .mul(propuesta.cantidadMeses)
      .mul(propuesta.porcentajeSeg.div(100));

    return {
      id: propuesta.id,
      proyectoId: propuesta.proyectoId,
      costoTotalAproximado: propuesta.costoTotalAproximado.toString(),
      ahorroMensual: propuesta.ahorroMensual.toString(),
      cantidadMeses: propuesta.cantidadMeses,
      porcentajeSeg: propuesta.porcentajeSeg.toString(),
      honorarios: honorarios.toString(),
      moneda: propuesta.moneda,
      estado: propuesta.estado,
      archivoRuta: propuesta.archivoRuta,
      archivoMimeType: propuesta.archivoMimeType,
      archivoNombreOriginal: propuesta.archivoNombreOriginal,
    };
  }
}
