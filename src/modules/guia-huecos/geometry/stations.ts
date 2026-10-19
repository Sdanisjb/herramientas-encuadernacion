/**
 * Geometría pura de los huecos. Sin dependencias de UI ni de render.
 * Posiciones en mm medidas desde el borde de cabeza del lomo.
 */
const EPS = 1e-9;
const MAX_HOLES = 200;

export type CountMode = 'count' | 'spacing';

export interface PatternInput {
  spineLength: number;
  headMargin: number;
  tailMargin: number;
  mode: CountMode;
  count: number;
  spacing: number;
  /** En modo espaciado, reparte el sobrante para que el último hueco caiga justo en el margen de pie. */
  distribute: boolean;
  /** Paridad exigida al número de huecos: par (robada), impar (japonesa) o cualquiera (sin restricción). */
  parity: Parity;
}

export type Parity = 'any' | 'even' | 'odd';

const PARITY_WORD = { even: 'par', odd: 'impar' } as const;
const parityMatches = (n: number, parity: Parity) =>
  parity === 'any' || (parity === 'even' ? n % 2 === 0 : n % 2 !== 0);

/** Vecinos válidos del número `n` para la paridad pedida (p. ej. 7 con 'even' -> 6 y 8). */
function neighbours(n: number, parity: Exclude<Parity, 'any'>): number[] {
  const min = parity === 'even' ? 2 : 1;
  return [n - 1, n + 1].filter((v) => v >= min);
}

export type StationsResult =
  | {
      ok: true;
      positions: number[];
      count: number;
      /** Espaciado real entre huecos consecutivos (0 si hay un solo hueco). */
      spacing: number;
      /** Largo útil entre el primer y el último hueco posibles. */
      usable: number;
      /** Sobrante sin usar al pie (solo en modo espaciado sin distribuir). */
      leftover: number;
    }
  | { ok: false; error: string };

export function computeStations(p: PatternInput): StationsResult {
  if (![p.spineLength, p.headMargin, p.tailMargin].every(Number.isFinite)) {
    return { ok: false, error: 'Revisa los valores: hay campos vacíos o no numéricos.' };
  }
  if (p.spineLength <= 0) return { ok: false, error: 'El largo del lomo debe ser mayor que 0.' };
  if (p.headMargin < 0 || p.tailMargin < 0) return { ok: false, error: 'Los márgenes no pueden ser negativos.' };

  const usable = p.spineLength - p.headMargin - p.tailMargin;
  if (usable < 0) {
    return { ok: false, error: 'Los márgenes de cabeza y pie suman más que el largo del lomo.' };
  }

  let count: number;
  let spacing: number;
  let leftover = 0;

  if (p.mode === 'count') {
    count = Math.round(p.count);
    if (!Number.isFinite(count) || count < 1) return { ok: false, error: 'Indica al menos 1 hueco.' };
    if (count > MAX_HOLES) return { ok: false, error: `El máximo es ${MAX_HOLES} huecos.` };
    if (p.parity !== 'any' && !parityMatches(count, p.parity)) {
      return {
        ok: false,
        error:
          `El número de huecos debe ser ${PARITY_WORD[p.parity]}. ` +
          `Los más cercanos son ${neighbours(count, p.parity).join(' y ')}.`,
      };
    }
    spacing = count > 1 ? usable / (count - 1) : 0;
  } else {
    if (!Number.isFinite(p.spacing) || p.spacing <= 0) {
      return { ok: false, error: 'El espaciado debe ser mayor que 0.' };
    }
    count = Math.floor(usable / p.spacing + EPS) + 1;
    // Si cabe un número con otra paridad, se descarta el último hueco.
    if (!parityMatches(count, p.parity)) count -= 1;
    if (count < 1 || (p.parity === 'even' && count < 2)) {
      return { ok: false, error: 'Con ese espaciado no caben dos huecos entre los márgenes.' };
    }
    if (count > MAX_HOLES) return { ok: false, error: `El espaciado genera más de ${MAX_HOLES} huecos.` };
    if (count > 1 && p.distribute) {
      spacing = usable / (count - 1);
    } else {
      spacing = p.spacing;
      leftover = usable - (count - 1) * spacing;
      if (leftover < EPS) leftover = 0;
    }
  }

  // Un único hueco se centra entre los márgenes.
  const positions =
    count === 1
      ? [p.headMargin + usable / 2]
      : Array.from({ length: count }, (_, i) => p.headMargin + i * spacing);

  if (count === 1) {
    spacing = 0;
    leftover = 0;
  }

  return { ok: true, positions, count, spacing, usable, leftover };
}

export interface SetsInput {
  spineLength: number;
  headMargin: number;
  tailMargin: number;
  /** 'count': por cantidad de conjuntos. 'spacing': por medidas exactas. */
  mode: CountMode;
  sets: number;
  /** Ancho de cada X (distancia entre sus dos huecos). */
  xWidth: number;
  /** Separación entre una X y la siguiente. */
  betweenGap: number;
  /** Si es true, la separación entre X es igual al ancho de la X. */
  linked: boolean;
  /** En modo medidas, reparte el sobrante escalando ancho y separación. */
  distribute: boolean;
}

export type SetsResult =
  | {
      ok: true;
      positions: number[];
      /** Pares de posiciones (inicio, fin) de cada X. */
      sets: [number, number][];
      setCount: number;
      xWidth: number;
      betweenGap: number;
      usable: number;
      leftover: number;
    }
  | { ok: false; error: string };

/**
 * Francesa: cada conjunto (X) ocupa dos huecos contiguos. Entre un conjunto y el
 * siguiente hay una separación (por defecto igual al ancho de la X).
 */
export function computeSets(p: SetsInput): SetsResult {
  if (![p.spineLength, p.headMargin, p.tailMargin].every(Number.isFinite)) {
    return { ok: false, error: 'Revisa los valores: hay campos vacíos o no numéricos.' };
  }
  if (p.spineLength <= 0) return { ok: false, error: 'El largo del lomo debe ser mayor que 0.' };
  if (p.headMargin < 0 || p.tailMargin < 0) return { ok: false, error: 'Los márgenes no pueden ser negativos.' };

  const usable = p.spineLength - p.headMargin - p.tailMargin;
  if (usable <= 0) {
    return { ok: false, error: 'Los márgenes de cabeza y pie no dejan espacio para ningún conjunto.' };
  }
  if (!p.linked && !(Number.isFinite(p.betweenGap) && p.betweenGap > 0)) {
    return { ok: false, error: 'La separación entre conjuntos debe ser mayor que 0.' };
  }

  let k: number;
  let s: number;
  let g: number;
  let leftover = 0;

  if (p.mode === 'count') {
    k = Math.round(p.sets);
    if (!Number.isFinite(k) || k < 1) return { ok: false, error: 'Indica al menos 1 conjunto.' };
    if (k * 2 > MAX_HOLES) return { ok: false, error: `El máximo es ${MAX_HOLES / 2} conjuntos.` };
    if (p.linked) {
      s = usable / (2 * k - 1);
      g = s;
    } else {
      g = p.betweenGap;
      s = (usable - (k - 1) * g) / k;
      if (s <= EPS) {
        return { ok: false, error: 'La separación entre conjuntos no deja espacio para el ancho de las X.' };
      }
    }
  } else {
    if (!Number.isFinite(p.xWidth) || p.xWidth <= 0) {
      return { ok: false, error: 'El ancho de la X debe ser mayor que 0.' };
    }
    s = p.xWidth;
    g = p.linked ? s : p.betweenGap;
    if (s > usable + EPS) {
      return { ok: false, error: 'El ancho de la X no cabe entre los márgenes.' };
    }
    k = Math.floor((usable + g) / (s + g) + EPS);
    if (k < 1) k = 1;
    if (k * 2 > MAX_HOLES) return { ok: false, error: `Esas medidas generan más de ${MAX_HOLES / 2} conjuntos.` };
    const used = k * s + (k - 1) * g;
    if (p.distribute) {
      const f = usable / used;
      s *= f;
      g *= f;
    } else {
      leftover = usable - used;
      if (leftover < EPS) leftover = 0;
    }
  }

  const sets: [number, number][] = [];
  const positions: number[] = [];
  for (let i = 0; i < k; i++) {
    const start = p.headMargin + i * (s + g);
    sets.push([start, start + s]);
    positions.push(start, start + s);
  }

  return { ok: true, positions, sets, setCount: k, xWidth: s, betweenGap: g, usable, leftover };
}
