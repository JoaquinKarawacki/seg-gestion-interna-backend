import { Global, Module } from '@nestjs/common';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaRepositorio } from './auditoria.repositorio';
import { AuditoriaService } from './auditoria.service';
import { AUDITORIA_REPOSITORIO } from './interfaces/auditoria-repositorio.interface';

@Global()
@Module({
  controllers: [AuditoriaController],
  providers: [
    AuditoriaService,
    {
      provide: AUDITORIA_REPOSITORIO,
      useClass: AuditoriaRepositorio,
    },
  ],
  // Global: casi todos los módulos de escritura necesitan AuditoriaService,
  // mismo criterio que PrismaModulo. Evita agregar este módulo al
  // `imports` de cada uno.
  exports: [AuditoriaService],
})
export class AuditoriaModulo {}
