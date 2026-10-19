import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { FormaPago } from '../../../generated/prisma/enums';

const convertirATexto = (valor: unknown) => valor === true || valor === 'true';

export class CrearOrdenPagoDto {
  // Toda orden de pago nace de una orden de compra (OrdenCompra) APROBADA. De la
  // OC se heredan tipo, sector, proveedor, moneda, IVA incluido y la cotización
  // (y de la cotización, proyecto/cliente/tarea); acá solo viaja lo que el usuario
  // ajusta pago a pago.
  @IsUUID()
  ordenCompraId!: string;

  @IsDateString()
  fecha!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  monto!: number;

  @IsString()
  @IsNotEmpty()
  concepto!: string;

  @IsEnum(FormaPago)
  formaPago!: FormaPago;

  @Transform(({ value }) => convertirATexto(value))
  @IsBoolean()
  pagaIva!: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;

  // Override explícito de la alarma de monto: cuando el monto supera lo disponible
  // de la cotización, el backend bloquea con 422 MONTO_EXCEDE_COTIZACION; el
  // frontend muestra la advertencia y reenvía con este flag en true para confirmar.
  @Transform(({ value }) => convertirATexto(value))
  @IsOptional()
  @IsBoolean()
  confirmarExcesoMonto?: boolean;
}
