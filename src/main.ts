import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Express, NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ExcepcionGlobalFiltro } from './comun/filtros/excepcion-global.filtro';
import { ValidacionPipe } from './comun/pipes/validacion.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Sin esto, Express agrega ETag a cada respuesta y el navegador cachea
  // los GET, sirviendo datos viejos (304) después de un update.
  (app.getHttpAdapter().getInstance() as Express).set('etag', false);
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

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
bootstrap().catch((error) => {
  console.error('Error fatal al iniciar la aplicación:', error);
  process.exit(1);
});
