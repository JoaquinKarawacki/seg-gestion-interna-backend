import { Module } from '@nestjs/common';
import { UsuariosRepositorio } from './usuarios.repositorio';
import { USUARIOS_REPOSITORIO } from './interfaces/usuarios-repositorio.interface';

@Module({
  providers: [{ provide: USUARIOS_REPOSITORIO, useClass: UsuariosRepositorio }],
  exports: [USUARIOS_REPOSITORIO],
})
export class UsuariosModulo {}
