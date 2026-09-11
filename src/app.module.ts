import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditoriaModulo } from './auditoria/auditoria.modulo';
import { AuthModulo } from './auth/auth.modulo';
import { ClientesModulo } from './clientes/clientes.modulo';
import { ComentariosModulo } from './comentarios/comentarios.modulo';
import { CotizacionesModulo } from './cotizaciones/cotizaciones.modulo';
import { NotificacionesModulo } from './notificaciones/notificaciones.modulo';
import { OrdenesCompraModulo } from './ordenes-compra/ordenes-compra.modulo';
import { PrismaModulo } from './prisma/prisma.modulo';
import { ProveedoresModulo } from './proveedores/proveedores.modulo';
import { ProyectosModulo } from './proyectos/proyectos.modulo';
import { SectoresModulo } from './sectores/sectores.modulo';
import { TareasModulo } from './tareas/tareas.modulo';
import { TiposCambioModulo } from './tipos-cambio/tipos-cambio.modulo';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    PrismaModulo,
    AuditoriaModulo,
    AuthModulo,
    SectoresModulo,
    ClientesModulo,
    ProveedoresModulo,
    ProyectosModulo,
    TareasModulo,
    CotizacionesModulo,
    OrdenesCompraModulo,
    ComentariosModulo,
    NotificacionesModulo,
    TiposCambioModulo,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
