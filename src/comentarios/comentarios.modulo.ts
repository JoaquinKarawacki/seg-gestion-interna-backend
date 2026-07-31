import { Module } from '@nestjs/common';
import { OrdenesCompraModulo } from '../ordenes-compra/ordenes-compra.modulo';
import { ComentariosController } from './comentarios.controller';
import { ComentariosRepositorio } from './comentarios.repositorio';
import { ComentariosService } from './comentarios.service';
import { COMENTARIOS_REPOSITORIO } from './interfaces/comentarios-repositorio.interface';

@Module({
  imports: [OrdenesCompraModulo],
  controllers: [ComentariosController],
  providers: [
    ComentariosService,
    {
      provide: COMENTARIOS_REPOSITORIO,
      useClass: ComentariosRepositorio,
    },
  ],
})
export class ComentariosModulo {}
