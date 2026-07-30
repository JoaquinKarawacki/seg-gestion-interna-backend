import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { OrdenCompraModel } from '../../generated/prisma/models';
import { ALMACENAMIENTO } from '../almacenamiento/puertos/almacenamiento.puerto';
import type {
  ArchivoAlmacenado,
  IAlmacenamiento,
} from '../almacenamiento/puertos/almacenamiento.puerto';
import { COTIZACIONES_REPOSITORIO } from '../cotizaciones/interfaces/cotizaciones-repositorio.interface';
import type { ICotizacionesRepositorio } from '../cotizaciones/interfaces/cotizaciones-repositorio.interface';
import { PROYECTOS_REPOSITORIO } from '../proyectos/interfaces/proyectos-repositorio.interface';
import type { IProyectosRepositorio } from '../proyectos/interfaces/proyectos-repositorio.interface';
import { ActualizarOrdenCompraDto } from './dtos/actualizar-orden-compra.dto';
import { CrearOrdenCompraDto } from './dtos/crear-orden-compra.dto';
import { RespuestaOrdenCompraDto } from './dtos/respuesta-orden-compra.dto';
import { ORDENES_COMPRA_REPOSITORIO } from './interfaces/ordenes-compra-repositorio.interface';
import type { IOrdenesCompraRepositorio } from './interfaces/ordenes-compra-repositorio.interface';
import { mapearRespuestaOrdenCompra } from './ordenes-compra.mapper';
import { CadenaValidacionOC } from './validaciones/cadena-validacion-oc';
import { ValidarProveedorCoincideCotizacionEslabon } from './validaciones/validar-proveedor-coincide-cotizacion.eslabon';

const CARPETA_ARCHIVOS = 'ordenes-compra';

export interface ArchivoDescargado {
  buffer: Buffer;
  nombreArchivo: string;
}

interface JerarquiaDerivada {
  clienteId: string | null;
  proyectoId: string | null;
  tareaId: string | null;
}

@Injectable()
export class OrdenesCompraService {
  constructor(
    @Inject(ORDENES_COMPRA_REPOSITORIO)
    private readonly ordenesCompraRepositorio: IOrdenesCompraRepositorio,
    @Inject(COTIZACIONES_REPOSITORIO)
    private readonly cotizacionesRepositorio: ICotizacionesRepositorio,
    @Inject(PROYECTOS_REPOSITORIO)
    private readonly proyectosRepositorio: IProyectosRepositorio,
    @Inject(ALMACENAMIENTO)
    private readonly almacenamiento: IAlmacenamiento,
    private readonly cadenaValidacionOC: CadenaValidacionOC,
    private readonly validarProveedorEslabon: ValidarProveedorCoincideCotizacionEslabon,
  ) {}

  async listar(): Promise<RespuestaOrdenCompraDto[]> {
    const ordenes = await this.ordenesCompraRepositorio.buscarTodos();
    return ordenes.map((orden) => mapearRespuestaOrdenCompra(orden));
  }

  async buscarPorId(id: string): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    return mapearRespuestaOrdenCompra(orden);
  }

  async crear(
    dto: CrearOrdenCompraDto,
    factura?: Express.Multer.File,
  ): Promise<RespuestaOrdenCompraDto> {
    const jerarquia = await this.derivarJerarquia(dto.cotizacionId);
    const monto = new Prisma.Decimal(dto.monto);

    await this.cadenaValidacionOC.ejecutar({
      proveedorId: dto.proveedorId,
      cotizacionId: dto.cotizacionId ?? null,
      monto,
    });

    const facturaGuardada = factura
      ? await this.almacenamiento.guardar(
          factura.buffer,
          factura.originalname,
          CARPETA_ARCHIVOS,
        )
      : null;

    try {
      const orden = await this.ordenesCompraRepositorio.crear({
        tipo: dto.tipo,
        fecha: new Date(dto.fecha),
        sectorId: dto.sectorId,
        proveedorId: dto.proveedorId,
        clienteId: jerarquia.clienteId,
        proyectoId: jerarquia.proyectoId,
        tareaId: jerarquia.tareaId,
        cotizacionId: dto.cotizacionId ?? null,
        moneda: dto.moneda,
        monto,
        concepto: dto.concepto,
        formaPago: dto.formaPago,
        pagaIva: dto.pagaIva,
        ivaIncluido: dto.ivaIncluido,
        observaciones: dto.observaciones ?? null,
        facturaPdfRuta: facturaGuardada?.referencia ?? null,
      });

      return mapearRespuestaOrdenCompra(orden);
    } catch (error) {
      await this.revertirArchivoGuardado(facturaGuardada);
      throw error;
    }
  }

  async actualizar(
    id: string,
    dto: ActualizarOrdenCompraDto,
  ): Promise<RespuestaOrdenCompraDto> {
    const ordenExistente = await this.obtenerOrdenOFallar(id);

    if (dto.proveedorId && ordenExistente.cotizacionId) {
      await this.validarProveedorEslabon.ejecutarValidacion({
        proveedorId: dto.proveedorId,
        cotizacionId: ordenExistente.cotizacionId,
        monto: ordenExistente.monto,
      });
    }

    const orden = await this.ordenesCompraRepositorio.actualizar(id, {
      tipo: dto.tipo,
      fecha: dto.fecha ? new Date(dto.fecha) : undefined,
      sectorId: dto.sectorId,
      proveedorId: dto.proveedorId,
      moneda: dto.moneda,
      concepto: dto.concepto,
      formaPago: dto.formaPago,
      pagaIva: dto.pagaIva,
      ivaIncluido: dto.ivaIncluido,
      observaciones: dto.observaciones,
    });

    return mapearRespuestaOrdenCompra(orden);
  }

  async adjuntarFactura(
    id: string,
    factura: Express.Multer.File,
  ): Promise<RespuestaOrdenCompraDto> {
    const ordenExistente = await this.obtenerOrdenOFallar(id);
    const facturaGuardada = await this.almacenamiento.guardar(
      factura.buffer,
      factura.originalname,
      CARPETA_ARCHIVOS,
    );

    try {
      const orden = await this.ordenesCompraRepositorio.actualizar(id, {
        facturaPdfRuta: facturaGuardada.referencia,
      });

      if (ordenExistente.facturaPdfRuta) {
        await this.almacenamiento.eliminar(ordenExistente.facturaPdfRuta);
      }

      return mapearRespuestaOrdenCompra(orden);
    } catch (error) {
      await this.revertirArchivoGuardado(facturaGuardada);
      throw error;
    }
  }

  async descargarFactura(id: string): Promise<ArchivoDescargado> {
    const orden = await this.obtenerOrdenOFallar(id);

    if (!orden.facturaPdfRuta) {
      throw new NotFoundException({
        error: 'ORDEN_COMPRA_SIN_FACTURA',
        mensaje: 'Esta orden de compra no tiene una factura adjunta',
      });
    }

    const buffer = await this.almacenamiento.leer(orden.facturaPdfRuta);
    return { buffer, nombreArchivo: `orden-compra-${orden.numero}.pdf` };
  }

  async eliminar(id: string): Promise<void> {
    const orden = await this.obtenerOrdenOFallar(id);
    await this.ordenesCompraRepositorio.eliminar(id);

    if (orden.facturaPdfRuta) {
      await this.almacenamiento.eliminar(orden.facturaPdfRuta);
    }
  }

  private async derivarJerarquia(
    cotizacionId?: string,
  ): Promise<JerarquiaDerivada> {
    if (!cotizacionId) {
      return { clienteId: null, proyectoId: null, tareaId: null };
    }

    const cotizacion =
      await this.cotizacionesRepositorio.buscarPorId(cotizacionId);

    if (!cotizacion) {
      throw new NotFoundException({
        error: 'COTIZACION_NO_ENCONTRADA',
        mensaje: 'No existe una cotización con ese ID',
      });
    }

    const proyecto = await this.proyectosRepositorio.buscarPorId(
      cotizacion.proyectoId,
    );

    return {
      clienteId: proyecto?.clienteId ?? null,
      proyectoId: cotizacion.proyectoId,
      tareaId: cotizacion.tareaId,
    };
  }

  private async obtenerOrdenOFallar(id: string): Promise<OrdenCompraModel> {
    const orden = await this.ordenesCompraRepositorio.buscarPorId(id);

    if (!orden) {
      throw new NotFoundException({
        error: 'ORDEN_COMPRA_NO_ENCONTRADA',
        mensaje: 'No existe una orden de compra con ese ID',
      });
    }

    return orden;
  }

  private async revertirArchivoGuardado(
    archivoGuardado: ArchivoAlmacenado | null,
  ): Promise<void> {
    if (archivoGuardado) {
      await this.almacenamiento.eliminar(archivoGuardado.referencia);
    }
  }
}
