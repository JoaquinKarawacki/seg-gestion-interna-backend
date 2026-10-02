import { ComentarioModel } from '../../../generated/prisma/models';

export const COMENTARIOS_REPOSITORIO = Symbol('IComentariosRepositorio');

export interface DatosCrearComentario {
  ordenPagoId: string;
  autorId: string;
  texto: string;
}

export interface IComentariosRepositorio {
  crear(datos: DatosCrearComentario): Promise<ComentarioModel>;
  buscarPorOrden(ordenPagoId: string): Promise<ComentarioModel[]>;
}
