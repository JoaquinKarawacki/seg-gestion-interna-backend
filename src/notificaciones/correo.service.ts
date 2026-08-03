import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TokenEnCache {
  token: string;
  expiraEn: number;
}

@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);
  private tokenEnCache: TokenEnCache | null = null;

  constructor(private readonly configService: ConfigService) {}

  // Client credentials flow: la app se autentica a sí misma contra Azure AD
  // (no hay un usuario logueado), pidiendo un token con permiso Mail.Send.
  private async obtenerToken(): Promise<string> {
    if (this.tokenEnCache && this.tokenEnCache.expiraEn > Date.now()) {
      return this.tokenEnCache.token;
    }

    const tenantId = this.configService.get<string>('AZURE_TENANT_ID', '');
    const clientId = this.configService.get<string>('AZURE_CLIENT_ID', '');
    const clientSecret = this.configService.get<string>(
      'AZURE_CLIENT_SECRET',
      '',
    );

    const respuesta = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      },
    );

    if (!respuesta.ok) {
      throw new Error(
        `No se pudo obtener el token de Azure AD (${respuesta.status}): ${await respuesta.text()}`,
      );
    }

    const datos = (await respuesta.json()) as {
      access_token: string;
      expires_in: number;
    };

    // Restamos un margen para no usar un token a punto de vencer.
    this.tokenEnCache = {
      token: datos.access_token,
      expiraEn: Date.now() + (datos.expires_in - 60) * 1000,
    };

    return this.tokenEnCache.token;
  }

  async enviar(
    destinatarios: string[],
    asunto: string,
    cuerpoHtml: string,
  ): Promise<void> {
    if (destinatarios.length === 0) return;

    try {
      const token = await this.obtenerToken();
      const remitente = this.configService.get<string>('EMAIL_REMITENTE', '');

      const respuesta = await fetch(
        `https://graph.microsoft.com/v1.0/users/${remitente}/sendMail`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              subject: asunto,
              body: { contentType: 'HTML', content: cuerpoHtml },
              toRecipients: destinatarios.map((email) => ({
                emailAddress: { address: email },
              })),
            },
          }),
        },
      );

      if (!respuesta.ok) {
        throw new Error(
          `Graph respondió ${respuesta.status}: ${await respuesta.text()}`,
        );
      }
    } catch (error) {
      // Un fallo al mandar el mail no debe tumbar la operación que lo disparó.
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No se pudo enviar el mail de notificación: ${mensaje}`,
      );
    }
  }
}
