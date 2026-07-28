import { Module } from '@nestjs/common';
import { PROVEEDORES_REPOSITORIO } from './interfaces/proveedores-repositorio.interface';
import { ProveedoresController } from './proveedores.controller';
import { ProveedoresRepositorio } from './proveedores.repositorio';
import { ProveedoresService } from './proveedores.service';

@Module({
  controllers: [ProveedoresController],
  providers: [
    ProveedoresService,
    { provide: PROVEEDORES_REPOSITORIO, useClass: ProveedoresRepositorio },
  ],
  exports: [PROVEEDORES_REPOSITORIO],
})
export class ProveedoresModulo {}
