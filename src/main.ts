import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExcepcionGlobalFiltro } from './comun/filtros/excepcion-global.filtro';
import { ValidacionPipe } from './comun/pipes/validacion.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ExcepcionGlobalFiltro());
  app.useGlobalPipes(new ValidacionPipe());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
