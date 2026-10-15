import { INK_RGB, type Sheet } from './draw';

const MM_TO_PT = 72 / 25.4;

/**
 * Genera un PDF vectorial a escala 1:1: una página por hoja, con el tamaño
 * exacto de la hoja. jsPDF se carga bajo demanda para no inflar el bundle inicial.
 */
export async function sheetsToPdfBlob(sheets: Sheet[], title: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const [first, ...rest] = sheets;
  const orient = (s: Sheet) => (s.width >= s.height ? 'landscape' : 'portrait');

  const doc = new jsPDF({
    unit: 'mm',
    format: [Math.min(first.width, first.height), Math.max(first.width, first.height)],
    orientation: orient(first),
    compress: true,
  });
  doc.setProperties({ title });

  const draw = (sheet: Sheet) => {
    for (const op of sheet.ops) {
      const [r, g, b] = INK_RGB[op.ink];
      if (op.t === 'text') {
        doc.setTextColor(r, g, b);
        doc.setFont('helvetica', op.bold ? 'bold' : 'normal');
        doc.setFontSize(op.size * MM_TO_PT);
        doc.text(op.text, op.x, op.y, { align: op.anchor === 'middle' ? 'center' : op.anchor === 'end' ? 'right' : 'left' });
        continue;
      }
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(op.width);
      if (op.t === 'line') {
        doc.setLineDashPattern(op.dash ? [...op.dash] : [], 0);
        doc.line(op.x1, op.y1, op.x2, op.y2);
      } else {
        doc.setLineDashPattern([], 0);
        doc.circle(op.cx, op.cy, op.r, 'S');
      }
    }
  };

  draw(first);
  for (const sheet of rest) {
    doc.addPage([Math.min(sheet.width, sheet.height), Math.max(sheet.width, sheet.height)], orient(sheet));
    draw(sheet);
  }
  return doc.output('blob');
}
