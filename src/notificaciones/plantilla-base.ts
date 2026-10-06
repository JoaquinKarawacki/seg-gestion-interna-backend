// Layout HTML compartido por los mails de notificación (OC y OP). Estilos
// inline porque los clientes de correo no respetan <style> ni clases.

const COLOR_MARCA = '#ca3517'; // rojo SEG (coincide con el front)
const PIE_POR_DEFECTO = 'SEG Ingeniería · Gestión Interna';

export interface BotonCorreo {
  texto: string;
  url: string;
}

export interface DatoCorreo {
  etiqueta: string;
  valor: string;
}

export function formatearMontoCorreo(monto: string, moneda: string): string {
  const numero = Number(monto);
  const formateado = Number.isFinite(numero)
    ? new Intl.NumberFormat('es-UY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numero)
    : monto;
  return `${moneda} ${formateado}`;
}

// Devuelve el botón solo si hay una URL base configurada (FRONTEND_URL).
export function construirBoton(
  baseUrl: string,
  ruta: string,
  texto: string,
): BotonCorreo | undefined {
  const base = baseUrl.replace(/\/+$/, '');
  if (!base) return undefined;
  return { texto, url: `${base}${ruta}` };
}

export function construirCuerpo(opciones: {
  titulo: string;
  intro: string;
  datos?: DatoCorreo[];
  boton?: BotonCorreo;
  pie?: string;
}): string {
  const { titulo, intro, datos = [], boton, pie = PIE_POR_DEFECTO } = opciones;

  const filasDatos = datos
    .map(
      (dato) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#6b7280;font-size:14px;vertical-align:top;">${dato.etiqueta}</td><td style="padding:4px 0;color:#111827;font-size:14px;font-weight:600;">${dato.valor}</td></tr>`,
    )
    .join('');

  const bloqueDatos = datos.length
    ? `<table style="margin:16px 0;border-collapse:collapse;">${filasDatos}</table>`
    : '';

  const bloqueBoton = boton
    ? `<p style="margin:24px 0 8px;"><a href="${boton.url}" style="background:${COLOR_MARCA};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">${boton.texto}</a></p>
       <p style="margin:0;color:#6b7280;font-size:12px;">O copiá este enlace: <a href="${boton.url}" style="color:${COLOR_MARCA};">${boton.url}</a></p>`
    : '';

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
  <h1 style="font-size:18px;margin:0 0 12px;color:${COLOR_MARCA};">${titulo}</h1>
  <p style="margin:0;font-size:14px;line-height:1.5;">${intro}</p>
  ${bloqueDatos}
  ${bloqueBoton}
  <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;padding-top:12px;">${pie}</p>
</div>`;
}
