import { Module } from '@nestjs/common';
import { AlmacenamientoModulo } from '../almacenamiento/almacenamiento.modulo';
import { PropuestasInversionController } from './propuestas-inversion.controller';
import { PropuestasInversionRepositorio } from './propuestas-inversion.repositorio';
import { PropuestasInversionService } from './propuestas-inversion.service';
import { PROPUESTAS_INVERSION_REPOSITORIO } from './interfaces/propuestas-inversion-repositorio.interface';

@Module({
  imports: [AlmacenamientoModulo],
  controllers: [PropuestasInversionController],
  providers: [
    PropuestasInversionService,
    {
      provide: PROPUESTAS_INVERSION_REPOSITORIO,
      useClass: PropuestasInversionRepositorio,
    },
  ],
  exports: [PROPUESTAS_INVERSION_REPOSITORIO],
})
export class PropuestasInversionModulo {}
