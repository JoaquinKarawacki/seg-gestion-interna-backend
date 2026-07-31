import { ComentarioModel } from '../../../generated/prisma/models';

export const COMENTARIOS_REPOSITORIO = Symbol('IComentariosRepositorio');

export interface DatosCrearComentario {
  ordenCompraId: string;
  autorId: string;
  texto: string;
}

export interface IComentariosRepositorio {
  crear(datos: DatosCrearComentario): Promise<ComentarioModel>;
  buscarPorOrden(ordenCompraId: string): Promise<ComentarioModel[]>;
}
