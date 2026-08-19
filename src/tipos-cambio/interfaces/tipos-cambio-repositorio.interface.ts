import { Moneda } from '../../../generated/prisma/enums';
import { TipoCambioModel } from '../../../generated/prisma/models';

export const TIPOS_CAMBIO_REPOSITORIO = Symbol('ITiposCambioRepositorio');

export interface ITiposCambioRepositorio {
  buscarTodos(): Promise<TipoCambioModel[]>;
  actualizar(moneda: Moneda, valorEnUyu: number): Promise<TipoCambioModel>;
}
