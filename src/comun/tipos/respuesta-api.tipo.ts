export interface RespuestaExitosa<T> {
  datos: T;
  mensaje: string;
}

export interface RespuestaLista<T> {
  datos: T[];
  total: number;
  pagina: number;
  porPagina: number;
}
