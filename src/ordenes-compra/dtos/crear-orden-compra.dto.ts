import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import {
  CategoriaOrdenCompra,
  FormaPago,
  Moneda,
  TipoOC,
} from '../../../generated/prisma/enums';
import { requiereProyecto } from '../ordenes-compra.constantes';

const aBooleano = (valor: unknown) => valor === true || valor === 'true';

export class CrearOrdenCompraDto {
  @IsEnum(CategoriaOrdenCompra)
  categoria!: CategoriaOrdenCompra;

  @IsEnum(TipoOC)
  tipo!: TipoOC;

  @IsUUID()
  sectorId!: string;

  @IsUUID()
  proveedorId!: string;

  // El proyecto solo se exige (y se usa) en las categorías con proyecto
  // (PROYECTOS_ESCO). En las demás no viaja: la OC no tiene proyecto/cliente.
  @ValidateIf((dto: CrearOrdenCompraDto) => requiereProyecto(dto.categoria))
  @IsUUID()
  proyectoId?: string;

  @IsEnum(Moneda)
  moneda!: Moneda;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  monto!: number;

  @IsString()
  @IsNotEmpty()
  concepto!: string;

  @Transform(({ value }) => aBooleano(value))
  @IsBoolean()
  pagaIva!: boolean;

  @Transform(({ value }) => aBooleano(value))
  @IsBoolean()
  ivaIncluido!: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;

  // Pago único: si es true, al aprobar la OC se genera sola una Orden de Pago por el
  // total con `pagoUnicoFormaPago`. El service valida que la forma de pago venga cuando
  // esPagoUnico es true (FORMA_PAGO_REQUERIDA_PAGO_UNICO).
  @Transform(({ value }) => aBooleano(value))
  @IsOptional()
  @IsBoolean()
  esPagoUnico?: boolean;

  @IsOptional()
  @IsEnum(FormaPago)
  pagoUnicoFormaPago?: FormaPago;
}
