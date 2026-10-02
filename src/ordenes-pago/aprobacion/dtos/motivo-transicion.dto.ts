import { IsNotEmpty, IsString } from 'class-validator';

export class MotivoTransicionDto {
  @IsString()
  @IsNotEmpty()
  motivo!: string;
}
