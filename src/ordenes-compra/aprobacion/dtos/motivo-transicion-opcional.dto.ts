import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MotivoTransicionOpcionalDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  motivo?: string;
}
