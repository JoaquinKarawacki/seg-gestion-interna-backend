import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Moneda } from '../../generated/prisma/enums';
import type { TipoCambioModel } from '../../generated/prisma/models';
import { ACCIONES_AUDITORIA } from '../auditoria/acciones-auditoria.constantes';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import { ActualizarTipoCambioDto } from './dtos/actualizar-tipo-cambio.dto';
import { RespuestaTipoCambioDto } from './dtos/respuesta-tipo-cambio.dto';
import { TIPOS_CAMBIO_REPOSITORIO } from './interfaces/tipos-cambio-repositorio.interface';
import type { ITiposCambioRepositorio } from './interfaces/tipos-cambio-repositorio.interface';

@Injectable()
export class TiposCambioService {
  constructor(
    @Inject(TIPOS_CAMBIO_REPOSITORIO)
    private readonly tiposCambioRepositorio: ITiposCambioRepositorio,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async listar(): Promise<RespuestaTipoCambioDto[]> {
    const tiposCambio = await this.tiposCambioRepositorio.buscarTodos();
    return tiposCambio.map((tipoCambio) => this.mapearRespuesta(tipoCambio));
  }

  async actualizar(
    moneda: Moneda,
    dto: ActualizarTipoCambioDto,
    usuarioActual: UsuarioAutenticado,
  ): Promise<RespuestaTipoCambioDto> {
    if (moneda === Moneda.UYU) {
      throw new UnprocessableEntityException({
        error: 'MONEDA_NO_EDITABLE',
        mensaje: 'UYU es la moneda base, no tiene tipo de cambio propio',
      });
    }

    const tipoCambio = await this.tiposCambioRepositorio.actualizar(
      moneda,
      dto.valorEnUyu,
    );

    await this.auditoriaService.registrar({
      usuarioId: usuarioActual.id,
      usuarioEmail: usuarioActual.email,
      accion: ACCIONES_AUDITORIA.ACTUALIZAR_TIPO_CAMBIO,
      descripcion: `Actualizó el tipo de cambio de ${moneda} a ${dto.valorEnUyu} UYU`,
      entidad: 'TipoCambio',
      entidadId: tipoCambio.id,
    });

    return this.mapearRespuesta(tipoCambio);
  }

  private mapearRespuesta(tipoCambio: TipoCambioModel): RespuestaTipoCambioDto {
    return {
      moneda: tipoCambio.moneda,
      valorEnUyu: tipoCambio.valorEnUyu.toString(),
    };
  }
}
