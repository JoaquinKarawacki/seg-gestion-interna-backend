import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { EstadoOC, RolUsuario } from '../../generated/prisma/enums';
import type {
  RubroModel,
  OrdenCompraModel,
} from '../../generated/prisma/models';
import { ALMACENAMIENTO } from '../almacenamiento/puertos/almacenamiento.puerto';
import type {
  ArchivoAlmacenado,
  IAlmacenamiento,
} from '../almacenamiento/puertos/almacenamiento.puerto';
import { ACCIONES_AUDITORIA } from '../auditoria/acciones-auditoria.constantes';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import { PROYECTOS_REPOSITORIO } from '../proyectos/interfaces/proyectos-repositorio.interface';
import type { IProyectosRepositorio } from '../proyectos/interfaces/proyectos-repositorio.interface';
import { RUBROS_REPOSITORIO } from '../rubros/interfaces/rubros-repositorio.interface';
import type { IRubrosRepositorio } from '../rubros/interfaces/rubros-repositorio.interface';
import { CrearOrdenCompraDto } from './dtos/crear-orden-compra.dto';
import { RespuestaOrdenCompraDto } from './dtos/respuesta-orden-compra.dto';
import {
  FiltrosOrdenCompra,
  PaginacionOrdenCompra,
  ORDENES_COMPRA_REPOSITORIO,
} from './interfaces/ordenes-compra-repositorio.interface';
import type { IOrdenesCompraRepositorio } from './interfaces/ordenes-compra-repositorio.interface';
import { mapearRespuestaOrdenCompra } from './ordenes-compra.mapper';

const CARPETA_ARCHIVOS = 'ordenes-compra';
const CODIGO_REFERENCIA_INVALIDA = 'P2003';

@Injectable()
export class OrdenesCompraService {
  constructor(
    @Inject(ORDENES_COMPRA_REPOSITORIO)
    private readonly ordenesCompraRepositorio: IOrdenesCompraRepositorio,
    @Inject(RUBROS_REPOSITORIO)
    private readonly rubrosRepositorio: IRubrosRepositorio,
    @Inject(PROYECTOS_REPOSITORIO)
    private readonly proyectosRepositorio: IProyectosRepositorio,
    @Inject(ALMACENAMIENTO)
    private readonly almacenamiento: IAlmacenamiento,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async listar(
    filtros: FiltrosOrdenCompra,
    paginacion: PaginacionOrdenCompra,
  ): Promise<{ datos: RespuestaOrdenCompraDto[]; total: number }> {
    const [solicitudes, total] = await Promise.all([
      this.ordenesCompraRepositorio.buscarConFiltros(filtros, paginacion),
      this.ordenesCompraRepositorio.contarConFiltros(filtros),
    ]);

    return {
      datos: solicitudes.map((solicitud) =>
        mapearRespuestaOrdenCompra(solicitud),
      ),
      total,
    };
  }

  async buscarPorId(id: string): Promise<RespuestaOrdenCompraDto> {
    const solicitud = await this.obtenerSolicitudOFallar(id);
    return mapearRespuestaOrdenCompra(solicitud);
  }

  async crear(
    dto: CrearOrdenCompraDto,
    usuario: UsuarioAutenticado,
    adjunto: Express.Multer.File,
  ): Promise<RespuestaOrdenCompraDto> {
    const proyecto = await this.proyectosRepositorio.buscarPorId(
      dto.proyectoId,
    );

    if (!proyecto) {
      throw new NotFoundException({
        error: 'PROYECTO_NO_ENCONTRADO',
        mensaje: 'No existe un proyecto con ese ID',
      });
    }

    // Pago único: la forma de pago es obligatoria porque la OP se genera con ella al aprobar.
    if (dto.esPagoUnico && !dto.pagoUnicoFormaPago) {
      throw new UnprocessableEntityException({
        error: 'FORMA_PAGO_REQUERIDA_PAGO_UNICO',
        mensaje: 'Indicá la forma de pago para generar el pago único',
      });
    }

    const rubro = await this.resolverRubro(dto);
    const monto = new Prisma.Decimal(dto.monto);

    const adjuntoGuardado = await this.almacenamiento.guardar(
      adjunto.buffer,
      adjunto.originalname,
      CARPETA_ARCHIVOS,
    );

    try {
      const solicitud = await this.ejecutarOMapearReferenciaInvalida(() =>
        this.ordenesCompraRepositorio.crearConCotizacionYTarea({
          tipo: dto.tipo,
          solicitanteId: usuario.id,
          sectorId: dto.sectorId,
          proveedorId: dto.proveedorId,
          clienteId: proyecto.clienteId,
          proyectoId: dto.proyectoId,
          rubroId: rubro.id,
          rubroNombre: rubro.nombre,
          moneda: dto.moneda,
          monto,
          concepto: dto.concepto,
          pagaIva: dto.pagaIva,
          ivaIncluido: dto.ivaIncluido,
          observaciones: dto.observaciones ?? null,
          archivoPdfRuta: adjuntoGuardado.referencia,
          esPagoUnico: dto.esPagoUnico ?? false,
          pagoUnicoFormaPago: dto.pagoUnicoFormaPago ?? null,
        }),
      );

      await this.auditoriaService.registrar({
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        accion: ACCIONES_AUDITORIA.CREAR_ORDEN_COMPRA,
        descripcion: `Creó la orden de compra #${solicitud.numero}`,
        entidad: 'OrdenCompra',
        entidadId: solicitud.id,
      });

      return mapearRespuestaOrdenCompra(solicitud);
    } catch (error) {
      await this.revertirArchivoGuardado(adjuntoGuardado);
      throw error;
    }
  }

  async eliminar(id: string, usuario: UsuarioAutenticado): Promise<void> {
    const solicitud = await this.obtenerSolicitudOFallar(id);
    this.validarPertenencia(solicitud, usuario);
    this.validarEsBorrador(solicitud);

    await this.ordenesCompraRepositorio.eliminar(id);
    await this.almacenamiento.eliminar(solicitud.archivoPdfRuta);

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      accion: ACCIONES_AUDITORIA.ELIMINAR_ORDEN_COMPRA,
      descripcion: `Eliminó la orden de compra #${solicitud.numero}`,
      entidad: 'OrdenCompra',
      entidadId: solicitud.id,
    });
  }

  async descargarAdjunto(
    id: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    const solicitud = await this.obtenerSolicitudOFallar(id);
    const buffer = await this.almacenamiento.leer(solicitud.archivoPdfRuta);
    return { buffer, nombreArchivo: `orden-pago-${solicitud.numero}.pdf` };
  }

  // Resuelve el rubro: uno existente por id, o crea/reutiliza por nombre
  // (caso "Otros"). Debe venir al menos uno de los dos.
  private async resolverRubro(dto: CrearOrdenCompraDto): Promise<RubroModel> {
    if (dto.rubroId) {
      const rubro = await this.rubrosRepositorio.buscarPorId(dto.rubroId);
      if (!rubro) {
        throw new NotFoundException({
          error: 'RUBRO_NO_ENCONTRADO',
          mensaje: 'No existe un rubro con ese ID',
        });
      }
      return rubro;
    }

    const nombre = dto.rubroNombre?.trim();
    if (!nombre) {
      throw new UnprocessableEntityException({
        error: 'RUBRO_REQUERIDO',
        mensaje: 'Debés elegir un rubro o ingresar uno nuevo',
      });
    }

    const existente = await this.rubrosRepositorio.buscarPorNombre(nombre);
    return existente ?? (await this.rubrosRepositorio.crear({ nombre }));
  }

  private async obtenerSolicitudOFallar(id: string): Promise<OrdenCompraModel> {
    const solicitud = await this.ordenesCompraRepositorio.buscarPorId(id);

    if (!solicitud) {
      throw new NotFoundException({
        error: 'ORDEN_COMPRA_NO_ENCONTRADA',
        mensaje: 'No existe una orden de compra con ese ID',
      });
    }

    return solicitud;
  }

  private validarPertenencia(
    solicitud: OrdenCompraModel,
    usuario: UsuarioAutenticado,
  ): void {
    const esElSolicitante = usuario.id === solicitud.solicitanteId;
    const esDelMismoSector = usuario.sectoresEncargado.includes(
      solicitud.sectorId,
    );
    const esAdmin = usuario.rol === RolUsuario.ADMIN;

    if (!esElSolicitante && !esDelMismoSector && !esAdmin) {
      throw new ForbiddenException({
        error: 'SIN_PERMISO_SOBRE_ORDEN_COMPRA',
        mensaje: 'No tenés permiso sobre esta orden de compra',
      });
    }
  }

  private validarEsBorrador(solicitud: OrdenCompraModel): void {
    if (solicitud.estado !== EstadoOC.BORRADOR) {
      throw new ConflictException({
        error: 'ORDEN_COMPRA_NO_ES_BORRADOR',
        mensaje:
          'Solo se puede eliminar una orden de compra en estado BORRADOR',
      });
    }
  }

  private async revertirArchivoGuardado(
    archivoGuardado: ArchivoAlmacenado | null,
  ): Promise<void> {
    if (archivoGuardado) {
      await this.almacenamiento.eliminar(archivoGuardado.referencia);
    }
  }

  private async ejecutarOMapearReferenciaInvalida(
    operacion: () => Promise<OrdenCompraModel>,
  ): Promise<OrdenCompraModel> {
    try {
      return await operacion();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === CODIGO_REFERENCIA_INVALIDA
      ) {
        throw new NotFoundException({
          error: 'REFERENCIA_NO_ENCONTRADA',
          mensaje: 'El proveedor, el sector o el proyecto indicado no existen',
        });
      }

      throw error;
    }
  }
}
