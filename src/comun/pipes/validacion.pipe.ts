import {
  BadRequestException,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

@Injectable()
export class ValidacionPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errores: ValidationError[]) =>
        new BadRequestException({
          error: 'DATOS_INVALIDOS',
          mensaje: construirMensajeDeErrores(errores),
        }),
    });
  }
}

function construirMensajeDeErrores(errores: ValidationError[]): string {
  return errores
    .flatMap((error) => Object.values(error.constraints ?? {}))
    .join('; ');
}
