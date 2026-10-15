import { INK_RGB, type DrawOp, type Sheet } from './draw';

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const rgb = (ink: keyof typeof INK_RGB) => `rgb(${INK_RGB[ink].join(',')})`;
const num = (n: number) => String(Math.round(n * 1000) / 1000);

function opToSvg(op: DrawOp): string {
  switch (op.t) {
    case 'line': {
      const dash = op.dash ? ` stroke-dasharray="${op.dash[0]} ${op.dash[1]}"` : '';
      return `<line x1="${num(op.x1)}" y1="${num(op.y1)}" x2="${num(op.x2)}" y2="${num(op.y2)}" stroke="${rgb(op.ink)}" stroke-width="${op.width}"${dash}/>`;
    }
    case 'circle':
      return `<circle cx="${num(op.cx)}" cy="${num(op.cy)}" r="${num(op.r)}" fill="none" stroke="${rgb(op.ink)}" stroke-width="${op.width}"/>`;
    case 'text': {
      const weight = op.bold ? ' font-weight="700"' : '';
      return `<text x="${num(op.x)}" y="${num(op.y)}" font-size="${op.size}" text-anchor="${op.anchor}" fill="${rgb(op.ink)}"${weight}>${escapeXml(op.text)}</text>`;
    }
  }
}

/**
 * Serializa una hoja a SVG con tamaño físico real (mm). El tamaño también se
 * expone como variables CSS (--w, --h) para que la hoja pueda escalarse en
 * pantalla y volver a su tamaño real al imprimir.
 */
export function sheetToSvg(sheet: Sheet): string {
  const w = `${num(sheet.width)}mm`;
  const h = `${num(sheet.height)}mm`;
  const body = sheet.ops.map(opToSvg).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(sheet.width)} ${num(sheet.height)}" ` +
    `width="${w}" height="${h}" style="--w:${w};--h:${h}" font-family="Helvetica, Arial, sans-serif">` +
    `<rect width="${num(sheet.width)}" height="${num(sheet.height)}" fill="#fff"/>${body}</svg>`
  );
}
