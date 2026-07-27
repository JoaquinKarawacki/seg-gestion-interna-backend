import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface RespuestaError {
  error: string;
  mensaje: string;
}

const CODIGOS_POR_ESTADO: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'DATOS_INVALIDOS',
  [HttpStatus.UNAUTHORIZED]: 'NO_AUTENTICADO',
  [HttpStatus.FORBIDDEN]: 'SIN_PERMISO',
  [HttpStatus.NOT_FOUND]: 'RECURSO_NO_ENCONTRADO',
  [HttpStatus.CONFLICT]: 'CONFLICTO_DE_ESTADO',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'REGLA_DE_NEGOCIO_VIOLADA',
};

const MENSAJE_ERROR_INTERNO = 'Ocurrió un error inesperado';
const ESTADO_ERROR_INTERNO: number = HttpStatus.INTERNAL_SERVER_ERROR;

@Catch()
export class ExcepcionGlobalFiltro implements ExceptionFilter {
  private readonly logger = new Logger(ExcepcionGlobalFiltro.name);

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const respuesta = contexto.getResponse<Response>();
    const { estado, cuerpo } = this.construirRespuesta(excepcion);

    if (estado >= ESTADO_ERROR_INTERNO) {
      this.logger.error(excepcion);
    }

    respuesta.status(estado).json(cuerpo);
  }

  private construirRespuesta(excepcion: unknown): {
    estado: number;
    cuerpo: RespuestaError;
  } {
    if (excepcion instanceof HttpException) {
      const estado = excepcion.getStatus();
      return { estado, cuerpo: this.normalizarCuerpo(excepcion, estado) };
    }

    return {
      estado: HttpStatus.INTERNAL_SERVER_ERROR,
      cuerpo: {
        error: 'ERROR_INTERNO',
        mensaje: MENSAJE_ERROR_INTERNO,
      },
    };
  }

  private normalizarCuerpo(
    excepcion: HttpException,
    estado: number,
  ): RespuestaError {
    const respuestaExcepcion = excepcion.getResponse();

    if (this.esRespuestaErrorValida(respuestaExcepcion)) {
      return respuestaExcepcion;
    }

    return {
      error: CODIGOS_POR_ESTADO[estado] ?? 'ERROR_DESCONOCIDO',
      mensaje: excepcion.message,
    };
  }

  private esRespuestaErrorValida(
    respuesta: unknown,
  ): respuesta is RespuestaError {
    return (
      typeof respuesta === 'object' &&
      respuesta !== null &&
      'error' in respuesta &&
      'mensaje' in respuesta
    );
  }
}
