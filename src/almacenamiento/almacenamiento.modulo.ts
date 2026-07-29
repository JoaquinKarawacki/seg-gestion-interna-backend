import { Module } from '@nestjs/common';
import { RailwayVolumenAdaptador } from './adaptadores/railway-volumen.adaptador';
import { ALMACENAMIENTO } from './puertos/almacenamiento.puerto';

@Module({
  providers: [{ provide: ALMACENAMIENTO, useClass: RailwayVolumenAdaptador }],
  exports: [ALMACENAMIENTO],
})
export class AlmacenamientoModulo {}
