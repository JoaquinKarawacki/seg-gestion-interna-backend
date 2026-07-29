import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  ArchivoAlmacenado,
  IAlmacenamiento,
} from '../puertos/almacenamiento.puerto';

const RUTA_ALMACENAMIENTO_LOCAL_POR_DEFECTO = './almacenamiento-local';

@Injectable()
export class RailwayVolumenAdaptador implements IAlmacenamiento {
  private readonly rutaBase: string;

  constructor(configService: ConfigService) {
    this.rutaBase = configService.get<string>(
      'RUTA_ALMACENAMIENTO',
      RUTA_ALMACENAMIENTO_LOCAL_POR_DEFECTO,
    );
  }

  async guardar(
    buffer: Buffer,
    nombreOriginal: string,
    carpeta: string,
  ): Promise<ArchivoAlmacenado> {
    const extension = nombreOriginal.split('.').pop();
    const nombreArchivo = `${randomUUID()}.${extension}`;
    const referencia = join(carpeta, nombreArchivo);
    const rutaAbsoluta = join(this.rutaBase, referencia);

    await mkdir(join(this.rutaBase, carpeta), { recursive: true });
    await writeFile(rutaAbsoluta, buffer);

    return { referencia, rutaAbsoluta };
  }

  async eliminar(referencia: string): Promise<void> {
    await rm(join(this.rutaBase, referencia), { force: true });
  }

  async leer(referencia: string): Promise<Buffer> {
    return readFile(join(this.rutaBase, referencia));
  }
}
