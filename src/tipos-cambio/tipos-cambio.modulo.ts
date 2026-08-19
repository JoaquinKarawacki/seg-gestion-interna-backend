import { Module } from '@nestjs/common';
import { TIPOS_CAMBIO_REPOSITORIO } from './interfaces/tipos-cambio-repositorio.interface';
import { TiposCambioController } from './tipos-cambio.controller';
import { TiposCambioRepositorio } from './tipos-cambio.repositorio';
import { TiposCambioService } from './tipos-cambio.service';

@Module({
  controllers: [TiposCambioController],
  providers: [
    TiposCambioService,
    { provide: TIPOS_CAMBIO_REPOSITORIO, useClass: TiposCambioRepositorio },
  ],
  exports: [TIPOS_CAMBIO_REPOSITORIO],
})
export class TiposCambioModulo {}
