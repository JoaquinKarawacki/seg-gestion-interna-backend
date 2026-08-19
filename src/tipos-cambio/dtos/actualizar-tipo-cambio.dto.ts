import { Type } from 'class-transformer';
import { IsNumber, IsPositive } from 'class-validator';

export class ActualizarTipoCambioDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  valorEnUyu!: number;
}
