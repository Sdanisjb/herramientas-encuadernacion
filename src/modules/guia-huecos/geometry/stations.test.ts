import { describe, expect, it } from 'vitest';
import { computeSets, computeStations, type PatternInput, type SetsInput } from './stations';

const base: PatternInput = {
  spineLength: 210,
  headMargin: 15,
  tailMargin: 15,
  mode: 'count',
  count: 7,
  spacing: 30,
  distribute: false,
  evenOnly: false,
};
function ok(input: PatternInput) {
  const r = computeStations(input);
  if (!r.ok) throw new Error(r.error);
  return r;
}

describe('computeStations', () => {
  it('modo número: reparte n huecos entre los márgenes', () => {
    const r = ok({ ...base, mode: 'count', count: 7 });
    expect(r.count).toBe(7);
    expect(r.spacing).toBeCloseTo(30);
    expect(r.positions[0]).toBeCloseTo(15);
    expect(r.positions[6]).toBeCloseTo(195);
    expect(r.leftover).toBe(0);
  });

  it('modo espaciado: calcula el número y deja sobrante', () => {
    const r = ok({ ...base, mode: 'spacing', spacing: 25 });
    // usable = 180 -> floor(180/25)+1 = 8 huecos, último en 15 + 175 = 190
    expect(r.count).toBe(8);
    expect(r.spacing).toBe(25);
    expect(r.positions[7]).toBeCloseTo(190);
    expect(r.leftover).toBeCloseTo(5);
  });

  it('modo espaciado exacto no deja sobrante ni pierde un hueco por flotantes', () => {
    const r = ok({ ...base, mode: 'spacing', spacing: 0.1 * 3 * 100 }); // 30.000000000000004
    expect(r.count).toBe(7);
    expect(r.leftover).toBe(0);
  });

  it('distribuir reajusta el espaciado para llenar el lomo', () => {
    const r = ok({ ...base, mode: 'spacing', spacing: 25, distribute: true });
    expect(r.count).toBe(8);
    expect(r.spacing).toBeCloseTo(180 / 7);
    expect(r.positions[7]).toBeCloseTo(195);
    expect(r.leftover).toBe(0);
  });

  it('un solo hueco se centra entre los márgenes', () => {
    const r = ok({ ...base, mode: 'count', count: 1 });
    expect(r.positions).toEqual([105]);
    expect(r.spacing).toBe(0);
  });

  it('espaciado mayor que el largo útil da un solo hueco', () => {
    const r = ok({ ...base, mode: 'spacing', spacing: 500 });
    expect(r.count).toBe(1);
  });

  it('rechaza márgenes que superan el lomo', () => {
    const r = computeStations({ ...base, headMargin: 120, tailMargin: 100 });
    expect(r.ok).toBe(false);
  });

  it('rechaza valores inválidos', () => {
    expect(computeStations({ ...base, mode: 'count', count: 0 }).ok).toBe(false);
    expect(computeStations({ ...base, mode: 'spacing', spacing: 0 }).ok).toBe(false);
    expect(computeStations({ ...base, headMargin: NaN }).ok).toBe(false);
    expect(computeStations({ ...base, mode: 'spacing', spacing: 0.5 }).ok).toBe(false); // > 200 huecos
  });
});

describe('computeStations con evenOnly (robada)', () => {
  const even: PatternInput = { ...base, evenOnly: true };

  it('acepta número par en modo número', () => {
    const r = ok({ ...even, count: 8 });
    expect(r.count).toBe(8);
    expect(r.spacing).toBeCloseTo(180 / 7);
  });

  it('rechaza número impar y sugiere vecinos pares', () => {
    const r = computeStations({ ...even, count: 7 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('6 o 8');
  });

  it('modo espaciado: si salen impares descarta el último', () => {
    // usable 180, espaciado 30 -> 7 huecos -> se queda en 6, sobra 30
    const r = ok({ ...even, mode: 'spacing', spacing: 30 });
    expect(r.count).toBe(6);
    expect(r.spacing).toBe(30);
    expect(r.leftover).toBeCloseTo(30);
  });

  it('modo espaciado par se deja tal cual', () => {
    const r = ok({ ...even, mode: 'spacing', spacing: 25 }); // 8 huecos
    expect(r.count).toBe(8);
  });

  it('distribuir con par reajusta el espaciado', () => {
    const r = ok({ ...even, mode: 'spacing', spacing: 30, distribute: true });
    expect(r.count).toBe(6);
    expect(r.spacing).toBeCloseTo(36);
    expect(r.positions[5]).toBeCloseTo(195);
  });

  it('error si con ese espaciado no caben dos huecos', () => {
    expect(computeStations({ ...even, mode: 'spacing', spacing: 500 }).ok).toBe(false);
  });

  it('un solo hueco no es válido', () => {
    expect(computeStations({ ...even, count: 1 }).ok).toBe(false);
  });

  it('márgenes de cabeza y pie distintos desplazan el patrón', () => {
    const r = ok({ ...even, headMargin: 20, tailMargin: 10, count: 6 });
    expect(r.positions[0]).toBeCloseTo(20);
    expect(r.positions[5]).toBeCloseTo(200);
  });
});

describe('computeSets (francesa)', () => {
  const sets: SetsInput = {
    spineLength: 210,
    headMargin: 15,
    tailMargin: 15,
    mode: 'count',
    sets: 3,
    xWidth: 25,
    betweenGap: 25,
    linked: true,
    distribute: false,
  };

  function okSets(input: SetsInput) {
    const r = computeSets(input);
    if (!r.ok) throw new Error(r.error);
    return r;
  }

  it('por cantidad con separación ligada: X y separación iguales llenan el lomo', () => {
    const r = okSets(sets); // usable 180 -> 5 intervalos iguales de 36
    expect(r.setCount).toBe(3);
    expect(r.positions).toHaveLength(6);
    expect(r.xWidth).toBeCloseTo(36);
    expect(r.betweenGap).toBeCloseTo(36);
    expect(r.positions[0]).toBeCloseTo(15);
    expect(r.positions[5]).toBeCloseTo(195);
    expect(r.leftover).toBe(0);
  });

  it('por cantidad con separación propia: calcula el ancho de X', () => {
    const r = okSets({ ...sets, linked: false, betweenGap: 40 });
    // 3 X + 2 separaciones de 40 = 180 -> X = 100/3
    expect(r.xWidth).toBeCloseTo(100 / 3);
    expect(r.betweenGap).toBe(40);
    expect(r.sets[1][0]).toBeCloseTo(15 + 100 / 3 + 40);
    expect(r.positions[5]).toBeCloseTo(195);
  });

  it('por medidas exactas: calcula cuántas X caben y deja sobrante', () => {
    const r = okSets({ ...sets, mode: 'spacing', xWidth: 25 });
    // (180 + 25) / 50 = 4.1 -> 4 X; usado 4*25 + 3*25 = 175; sobra 5
    expect(r.setCount).toBe(4);
    expect(r.leftover).toBeCloseTo(5);
    expect(r.positions[7]).toBeCloseTo(15 + 175);
  });

  it('por medidas con separación propia', () => {
    const r = okSets({ ...sets, mode: 'spacing', xWidth: 20, linked: false, betweenGap: 30 });
    // (180 + 30) / 50 = 4.2 -> 4 X; usado 80 + 90 = 170; sobra 10
    expect(r.setCount).toBe(4);
    expect(r.sets[1][0]).toBeCloseTo(15 + 50);
    expect(r.leftover).toBeCloseTo(10);
  });

  it('medidas exactas sin flotantes perdidos', () => {
    const r = okSets({ ...sets, mode: 'spacing', xWidth: 0.1 * 3 * 100 * 0.2 }); // 6.000000000000001
    expect(r.setCount).toBe(Math.floor((180 + 6) / 12 + 1e-9));
  });

  it('distribuir escala X y separación para llenar el lomo', () => {
    const r = okSets({ ...sets, mode: 'spacing', xWidth: 25, distribute: true });
    expect(r.setCount).toBe(4);
    expect(r.xWidth).toBeCloseTo(180 / 7);
    expect(r.leftover).toBe(0);
    expect(r.positions[7]).toBeCloseTo(195);
  });

  it('una sola X ocupa todo el espacio útil en modo cantidad', () => {
    const r = okSets({ ...sets, sets: 1 });
    expect(r.positions).toEqual([15, 195]);
  });

  it('errores: X mayor que el espacio útil, separación inválida, márgenes', () => {
    expect(computeSets({ ...sets, mode: 'spacing', xWidth: 500 }).ok).toBe(false);
    expect(computeSets({ ...sets, linked: false, betweenGap: 0 }).ok).toBe(false);
    expect(computeSets({ ...sets, linked: false, betweenGap: 100 }).ok).toBe(false); // 2 x 100 > 180
    expect(computeSets({ ...sets, headMargin: 150, tailMargin: 100 }).ok).toBe(false);
    expect(computeSets({ ...sets, sets: 0 }).ok).toBe(false);
  });
});
