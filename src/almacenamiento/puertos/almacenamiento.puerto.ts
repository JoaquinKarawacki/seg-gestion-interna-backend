export const ALMACENAMIENTO = Symbol('IAlmacenamiento');

export interface ArchivoAlmacenado {
  referencia: string;
  rutaAbsoluta: string;
}

export interface IAlmacenamiento {
  guardar(
    buffer: Buffer,
    nombreOriginal: string,
    carpeta: string,
  ): Promise<ArchivoAlmacenado>;
  eliminar(referencia: string): Promise<void>;
  leer(referencia: string): Promise<Buffer>;
}
