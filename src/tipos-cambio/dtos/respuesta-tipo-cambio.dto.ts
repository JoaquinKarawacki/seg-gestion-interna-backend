import { Moneda } from '../../../generated/prisma/enums';

export class RespuestaTipoCambioDto {
  moneda!: Moneda;
  valorEnUyu!: string;
}
