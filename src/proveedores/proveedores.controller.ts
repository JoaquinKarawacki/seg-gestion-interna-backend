import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RolUsuario } from '../../generated/prisma/enums';
import { Roles } from '../comun/decoradores/roles.decorador';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import {
  RespuestaExitosa,
  RespuestaLista,
} from '../comun/tipos/respuesta-api.tipo';
import { ActualizarProveedorDto } from './dtos/actualizar-proveedor.dto';
import { CrearProveedorDto } from './dtos/crear-proveedor.dto';
import { RespuestaProveedorDto } from './dtos/respuesta-proveedor.dto';
import { ProveedoresService } from './proveedores.service';

const ROLES_EDICION = [
  RolUsuario.ADMIN,
  RolUsuario.PAGOS,
  RolUsuario.ENCARGADO,
];

@Controller('proveedores')
@UseGuards(JwtGuardia, RolesGuardia)
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Get()
  async listar(): Promise<RespuestaLista<RespuestaProveedorDto>> {
    const datos = await this.proveedoresService.listar();
    return { datos, total: datos.length, pagina: 1, porPagina: datos.length };
  }

  @Get(':id')
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<RespuestaExitosa<RespuestaProveedorDto>> {
    const datos = await this.proveedoresService.buscarPorId(id);
    return { datos, mensaje: 'Proveedor obtenido correctamente' };
  }

  @Post()
  async crear(
    @Body() dto: CrearProveedorDto,
  ): Promise<RespuestaExitosa<RespuestaProveedorDto>> {
    const datos = await this.proveedoresService.crear(dto);
    return { datos, mensaje: 'Proveedor creado correctamente' };
  }

  @Patch(':id')
  @Roles(...ROLES_EDICION)
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarProveedorDto,
  ): Promise<RespuestaExitosa<RespuestaProveedorDto>> {
    const datos = await this.proveedoresService.actualizar(id, dto);
    return { datos, mensaje: 'Proveedor actualizado correctamente' };
  }

  @Delete(':id')
  @Roles(...ROLES_EDICION)
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param('id') id: string): Promise<void> {
    await this.proveedoresService.eliminar(id);
  }
}
