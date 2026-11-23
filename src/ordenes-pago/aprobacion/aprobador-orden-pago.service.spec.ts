import { RolUsuario } from '../../../generated/prisma/enums';
import type { UsuarioAutenticado } from '../../comun/interfaces/usuario-autenticado.interface';
import type {
  AprobadorOrdenCompra,
  IOrdenesCompraRepositorio,
} from '../../ordenes-compra/interfaces/ordenes-compra-repositorio.interface';
import { AprobadorOrdenPagoService } from './aprobador-orden-pago.service';

const SECTOR = 'sector-emove';
const OTRO_SECTOR = 'sector-otro';
const OP = { sectorId: SECTOR, ordenCompraId: 'oc-1' };

function usuario(
  id: string,
  extra: Partial<UsuarioAutenticado> = {},
): UsuarioAutenticado {
  return {
    id,
    email: `${id}@test`,
    roles: [RolUsuario.ENCARGADO],
    sectorId: null,
    sectoresEncargado: [],
    sectoresSuplente: [],
    ...extra,
  };
}

function aprobador(
  id: string,
  extra: Partial<AprobadorOrdenCompra> = {},
): AprobadorOrdenCompra {
  return {
    id,
    activo: true,
    sectoresEncargado: [{ id: SECTOR }],
    sectoresSuplente: [],
    ...extra,
  };
}

function crearServicio(ultimoAprobador: AprobadorOrdenCompra | null) {
  const repo = {
    buscarUltimoAprobador: jest.fn().mockResolvedValue(ultimoAprobador),
  } as unknown as IOrdenesCompraRepositorio;
  return new AprobadorOrdenPagoService(repo);
}

describe('AprobadorOrdenPagoService', () => {
  const jefeQueAprobo = usuario('jefe-a', { sectoresEncargado: [SECTOR] });
  const otroJefe = usuario('jefe-b', { sectoresEncargado: [SECTOR] });
  const suplente = usuario('suplente', { sectoresSuplente: [SECTOR] });

  it('quien aprobó la OC puede aprobar la OP', async () => {
    const servicio = crearServicio(aprobador('jefe-a'));
    await expect(servicio.puedeAprobar(OP, jefeQueAprobo)).resolves.toBe(true);
  });

  it('otro encargado del mismo sector NO puede', async () => {
    const servicio = crearServicio(aprobador('jefe-a'));
    await expect(servicio.puedeAprobar(OP, otroJefe)).resolves.toBe(false);
  });

  it('el suplente del sector puede', async () => {
    const servicio = crearServicio(aprobador('jefe-a'));
    await expect(servicio.puedeAprobar(OP, suplente)).resolves.toBe(true);
  });

  it('si quien aprobó la OC ya no está en el sector, vuelve la regla del sector', async () => {
    const servicio = crearServicio(
      aprobador('jefe-a', { sectoresEncargado: [{ id: OTRO_SECTOR }] }),
    );
    await expect(servicio.resolverAprobadorAsignadoId(OP)).resolves.toBeNull();
    await expect(servicio.puedeAprobar(OP, otroJefe)).resolves.toBe(true);
  });

  it('si quien aprobó la OC está inactivo, vuelve la regla del sector', async () => {
    const servicio = crearServicio(aprobador('jefe-a', { activo: false }));
    await expect(servicio.puedeAprobar(OP, otroJefe)).resolves.toBe(true);
  });

  it('OP sin OC de origen: cualquier encargado del sector', async () => {
    const servicio = crearServicio(null);
    const op = { sectorId: SECTOR, ordenCompraId: null };
    await expect(servicio.puedeAprobar(op, otroJefe)).resolves.toBe(true);
  });

  it('con la regla del sector, un encargado de otro sector NO puede', async () => {
    const servicio = crearServicio(null);
    const ajeno = usuario('ajeno', { sectoresEncargado: [OTRO_SECTOR] });
    await expect(servicio.puedeAprobar(OP, ajeno)).resolves.toBe(false);
  });

  it('el aprobador asignado puede seguir siéndolo como suplente', async () => {
    const servicio = crearServicio(
      aprobador('jefe-a', {
        sectoresEncargado: [],
        sectoresSuplente: [{ id: SECTOR }],
      }),
    );
    await expect(servicio.resolverAprobadorAsignadoId(OP)).resolves.toBe(
      'jefe-a',
    );
  });
});
