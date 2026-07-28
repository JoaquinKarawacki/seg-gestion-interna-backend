import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModulo } from './auth/auth.modulo';
import { PrismaModulo } from './prisma/prisma.modulo';
import { SectoresModulo } from './sectores/sectores.modulo';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModulo,
    AuthModulo,
    SectoresModulo,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
