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
