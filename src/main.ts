import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ExcepcionGlobalFiltro } from './comun/filtros/excepcion-global.filtro';
import { ValidacionPipe } from './comun/pipes/validacion.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // En producción solo el frontend puede pegarle a la API.
  // En desarrollo, si no está seteado FRONTEND_URL, queda abierto.
  app.enableCors(
    configService.get<string>('NODE_ENV') === 'production'
      ? {
          origin: configService.get<string>('FRONTEND_URL'),
          credentials: true,
        }
      : undefined,
  );

  app.useGlobalFilters(new ExcepcionGlobalFiltro());
  app.useGlobalPipes(new ValidacionPipe());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
