import { describe, expect, it } from 'vitest';
import { sheetsToPdfBlob } from '../../../core/pdf';
import { sheetToSvg } from '../../../core/svg';
import { DEFAULT_FORM, buildGuide, sheetDimensions } from './guide';

describe('sheetDimensions', () => {
  it('hoja sin plegar A4: apaisada, lomo = lado corto', () => {
    expect(sheetDimensions('A4', 'sheet')).toMatchObject({ width: 297, height: 210, spineLength: 210 });
  });

  it('página A5 plegada: la hoja es A4 y el lomo mide 210', () => {
    expect(sheetDimensions('A5', 'page')).toMatchObject({ width: 297, height: 210, spineLength: 210 });
  });

  it('Carta: página -> hoja tabloide', () => {
    const d = sheetDimensions('Carta', 'page');
    expect(d.spineLength).toBeCloseTo(279.4);
    expect(d.width).toBeCloseTo(431.8);
  });
});

describe('buildGuide francesa', () => {
  it('por defecto: 3 conjuntos = 6 huecos, separación igual al ancho de la X', () => {
    const g = buildGuide(DEFAULT_FORM);
    expect(g.ok).toBe(true);
    if (g.ok) {
      expect(g.sheets).toHaveLength(1);
      expect(g.summary.sets).toBe(3);
      expect(g.summary.count).toBe(6);
      expect(g.summary.xWidth).toBeCloseTo(36);
      expect(g.summary.betweenGap).toBeCloseTo(36);
    }
  });

  it('por medidas exactas reporta sobrante en un aviso', () => {
    const g = buildGuide({ ...DEFAULT_FORM, mode: 'spacing', xWidth: 25 });
    expect(g.ok && g.summary.sets).toBe(4);
    expect(g.ok && g.warnings.some((w) => w.includes('Sobran'))).toBe(true);
  });

  it('el SVG incluye cotas entre huecos y llaves X1..Xn', () => {
    const g = buildGuide(DEFAULT_FORM);
    if (!g.ok) throw new Error(g.error);
    const svg = sheetToSvg(g.sheets[0]);
    expect(svg).toContain('>X1<');
    expect(svg).toContain('>X3<');
    expect(svg).toContain('36 mm'); // distancia entre huecos
    expect(svg).toContain('>15 mm<'); // margen de cabeza
  });

  it('sin cotas no dibuja distancias ni llaves', () => {
    const g = buildGuide({ ...DEFAULT_FORM, showDimensions: false });
    if (!g.ok) throw new Error(g.error);
    const svg = sheetToSvg(g.sheets[0]);
    expect(svg).not.toContain('>X1<');
  });
});

describe('buildGuide robada', () => {
  it('exige número par de huecos', () => {
    expect(buildGuide({ ...DEFAULT_FORM, binding: 'robada', count: 7 }).ok).toBe(false);

    const even = buildGuide({ ...DEFAULT_FORM, binding: 'robada', count: 8 });
    expect(even.ok).toBe(true);
    if (even.ok) {
      expect(even.sheets).toHaveLength(1);
      expect(even.summary.count).toBe(8);
      expect(even.summary.spacing).toBeCloseTo(180 / 7);
      expect(even.summary.sets).toBeNull();
    }
  });

  it('en modo espaciado queda siempre en par', () => {
    const g = buildGuide({ ...DEFAULT_FORM, binding: 'robada', mode: 'spacing', spacing: 30 });
    expect(g.ok && g.summary.count).toBe(6);
  });
});

describe('buildGuide errores', () => {
  it('devuelve error si los márgenes no caben', () => {
    const g = buildGuide({ ...DEFAULT_FORM, headMargin: 150, tailMargin: 150 });
    expect(g.ok).toBe(false);
  });

  it('avisa si las marcas se solapan', () => {
    const g = buildGuide({ ...DEFAULT_FORM, holeDiameter: 40 });
    expect(g.ok && g.warnings.some((w) => w.includes('solapan'))).toBe(true);
  });
});

describe('export', () => {
  it('SVG con el tamaño físico en mm', () => {
    const g = buildGuide(DEFAULT_FORM);
    if (!g.ok) throw new Error(g.error);
    const svg = sheetToSvg(g.sheets[0]);
    expect(svg).toContain('width="297mm"');
    expect(svg).toContain('height="210mm"');
  });

  it('PDF de una página con el tamaño de la hoja', async () => {
    const g = buildGuide(DEFAULT_FORM);
    if (!g.ok) throw new Error(g.error);
    const blob = await sheetsToPdfBlob(g.sheets, 'test');
    const text = new TextDecoder('latin1').decode(await blob.arrayBuffer());
    expect(text.startsWith('%PDF')).toBe(true);
    expect((text.match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(1);
    // MediaBox A4 apaisado en puntos (297 x 210 mm): 841.89 x 595.28
    expect(text).toMatch(/\/MediaBox \[0 0 841\.88\d* 595\.27\d*\]/);
  });
});

describe('buildGuide japonesa', () => {
  const jp = { ...DEFAULT_FORM, binding: 'japonesa' as const, count: 7, headMargin: 15, tailMargin: 15 };

  it('por defecto: A4 horizontal 297×210, 7 huecos y línea a 10 mm del borde izquierdo', () => {
    const g = buildGuide(jp);
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    expect(g.sheets).toHaveLength(1);
    expect(g.summary).toMatchObject({ sheetWidth: 297, sheetHeight: 210, count: 7, edgeMargin: 10 });
    expect(g.summary.positions[0]).toBeCloseTo(15);
    expect(g.summary.positions[6]).toBeCloseTo(195);
    const svg = sheetToSvg(g.sheets[0]);
    expect(svg).toContain('x1="10" y1="0" x2="10" y2="210"'); // línea de huecos
    expect(svg).toContain('Esta plantilla sirve también para la tapa');
    expect(svg).toContain('>10 mm<'); // cota del margen de borde
  });

  it('vertical: A5 es 148×210', () => {
    const g = buildGuide({ ...jp, paper: 'A5', orientation: 'vertical' });
    expect(g.ok && [g.summary.sheetWidth, g.summary.sheetHeight]).toEqual([148, 210]);
  });

  it('horizontal: A5 es 210×148 y los huecos recorren 148 mm', () => {
    const g = buildGuide({ ...jp, paper: 'A5', orientation: 'horizontal', headMargin: 10, tailMargin: 10 });
    if (!g.ok) throw new Error(g.error);
    expect([g.summary.sheetWidth, g.summary.sheetHeight]).toEqual([210, 148]);
    expect(g.summary.positions[6]).toBeCloseTo(138);
  });

  it('costura a la derecha: la línea queda a ancho − margen del borde', () => {
    const g = buildGuide({ ...jp, bindingSide: 'derecho' });
    if (!g.ok) throw new Error(g.error);
    expect(sheetToSvg(g.sheets[0])).toContain('x1="287" y1="0" x2="287" y2="210"');
  });

  it('exige número impar de huecos', () => {
    expect(buildGuide({ ...jp, count: 6 }).ok).toBe(false);
  });

  it('en modo espaciado el número de huecos queda impar', () => {
    const g = buildGuide({ ...jp, mode: 'spacing', spacing: 25 });
    expect(g.ok && g.summary.count).toBe(7);
  });

  it('márgenes superior e inferior distintos', () => {
    const g = buildGuide({ ...jp, headMargin: 20, tailMargin: 10 });
    if (!g.ok) throw new Error(g.error);
    expect(g.summary.positions[0]).toBeCloseTo(20);
    expect(g.summary.positions[6]).toBeCloseTo(200);
  });

  it('errores del margen del borde', () => {
    expect(buildGuide({ ...jp, edgeMargin: 0 }).ok).toBe(false); // el hueco quedaría fuera
    expect(buildGuide({ ...jp, edgeMargin: -3 }).ok).toBe(false);
    expect(buildGuide({ ...jp, edgeMargin: 400 }).ok).toBe(false);
    expect(buildGuide({ ...jp, edgeMargin: NaN }).ok).toBe(false);
  });

  it('avisa si el margen del borde supera la mitad del ancho', () => {
    const g = buildGuide({ ...jp, paper: 'A6', orientation: 'vertical', edgeMargin: 60 });
    expect(g.ok && g.warnings.some((w) => w.includes('mitad del ancho'))).toBe(true);
  });

  it('el PDF de la japonesa tiene el tamaño de la hoja', async () => {
    const g = buildGuide(jp);
    if (!g.ok) throw new Error(g.error);
    const text = new TextDecoder('latin1').decode(await (await sheetsToPdfBlob(g.sheets, 't')).arrayBuffer());
    expect(text).toMatch(/\/MediaBox \[0 0 841\.88\d* 595\.27\d*\]/);
  });
});

describe('hojas pequeñas sin textos fuera de la hoja', () => {
  const texts = (svg: string) => [...svg.matchAll(/<text x="([\d.]+)"[^>]*text-anchor="(\w+)"/g)];

  it('A6 vertical japonesa: ningún texto empieza fuera de la hoja', () => {
    const g = buildGuide({ ...DEFAULT_FORM, binding: 'japonesa', paper: 'A6', orientation: 'vertical', count: 5 });
    if (!g.ok) throw new Error(g.error);
    for (const [, x] of texts(sheetToSvg(g.sheets[0]))) {
      expect(Number(x)).toBeGreaterThanOrEqual(0);
      expect(Number(x)).toBeLessThanOrEqual(105);
    }
  });
});
