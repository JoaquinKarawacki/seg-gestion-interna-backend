import { Module } from '@nestjs/common';
import { ClientesController } from './clientes.controller';
import { ClientesRepositorio } from './clientes.repositorio';
import { ClientesService } from './clientes.service';
import { CLIENTES_REPOSITORIO } from './interfaces/clientes-repositorio.interface';

@Module({
  controllers: [ClientesController],
  providers: [
    ClientesService,
    { provide: CLIENTES_REPOSITORIO, useClass: ClientesRepositorio },
  ],
  exports: [CLIENTES_REPOSITORIO],
})
export class ClientesModulo {}
