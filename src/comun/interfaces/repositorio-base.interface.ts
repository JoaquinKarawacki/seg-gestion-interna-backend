export interface IRepositorioBase<
  T,
  TCrear = Record<string, unknown>,
  TActualizar = Record<string, unknown>,
> {
  buscarPorId(id: string): Promise<T | null>;
  buscarTodos(filtros?: Record<string, unknown>): Promise<T[]>;
  crear(datos: TCrear): Promise<T>;
  actualizar(id: string, datos: TActualizar): Promise<T>;
  eliminar(id: string): Promise<void>;
}
