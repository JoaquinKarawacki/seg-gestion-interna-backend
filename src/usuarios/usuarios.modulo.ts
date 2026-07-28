import { Module } from '@nestjs/common';
import { USUARIOS_REPOSITORIO } from './interfaces/usuarios-repositorio.interface';
import { UsuariosController } from './usuarios.controller';
import { UsuariosRepositorio } from './usuarios.repositorio';
import { UsuariosService } from './usuarios.service';

@Module({
  controllers: [UsuariosController],
  providers: [
    UsuariosService,
    { provide: USUARIOS_REPOSITORIO, useClass: UsuariosRepositorio },
  ],
  exports: [USUARIOS_REPOSITORIO],
})
export class UsuariosModulo {}
