import { PAPERS, UNFOLDED_OF, type PaperId } from '../../../core/paper';
import type { Sheet } from '../../../core/draw';
import { fmt } from '../../../core/format';
import { buildSheet } from './sheet';
import { computeSets, computeStations, type CountMode } from './stations';

export type BindingType = 'francesa' | 'robada' | 'japonesa';
/** "sheet": el tamaño elegido es la hoja sin plegar. "page": es la página del libro ya plegada. */
export type SizeMode = 'sheet' | 'page';
export type Orientation = 'horizontal' | 'vertical';
export type BindingSide = 'izquierdo' | 'derecho';

export interface GuideForm {
  binding: BindingType;
  paper: PaperId;
  sizeMode: SizeMode;
  /** 'count': por cantidad (huecos o conjuntos). 'spacing': por medidas exactas. */
  mode: CountMode;
  /** Robada y japonesa: número de huecos (par en la robada, impar en la japonesa). */
  count: number;
  /** Robada y japonesa: espaciado entre huecos. */
  spacing: number;
  /** Francesa: cantidad de conjuntos (X). */
  sets: number;
  /** Francesa: ancho de cada X (distancia entre sus dos huecos). */
  xWidth: number;
  /** Francesa: separación entre X cuando no está ligada al ancho de la X. */
  betweenGap: number;
  /** Francesa: separación entre X igual al ancho de la X. */
  linked: boolean;
  distribute: boolean;
  /** Margen de cabeza (superior en la japonesa) hasta el primer hueco. */
  headMargin: number;
  /** Margen de pie (inferior en la japonesa) desde el último hueco. */
  tailMargin: number;
  holeDiameter: number;
  showDimensions: boolean;
  /** Japonesa: distancia del borde de la hoja a la línea de huecos. */
  edgeMargin: number;
  /** Japonesa: orientación de la hoja. */
  orientation: Orientation;
  /** Japonesa: borde de la hoja por el que va la costura. */
  bindingSide: BindingSide;
}

export const BINDING_LABEL: Record<BindingType, string> = {
  francesa: 'Francesa',
  robada: 'Robada',
  japonesa: 'Japonesa',
};

export const DEFAULT_FORM: GuideForm = {
  binding: 'francesa',
  paper: 'A4',
  sizeMode: 'sheet',
  mode: 'count',
  count: 8,
  spacing: 25,
  sets: 3,
  xWidth: 25,
  betweenGap: 25,
  linked: true,
  distribute: false,
  headMargin: 15,
  tailMargin: 15,
  holeDiameter: 1.5,
  showDimensions: true,
  edgeMargin: 10,
  orientation: 'horizontal',
  bindingSide: 'izquierdo',
};

export interface GuideSummary {
  /** Largo de la línea de huecos (lomo o alto de la hoja). */
  spineLength: number;
  sheetWidth: number;
  sheetHeight: number;
  paperLabel: string;
  /** Número total de huecos. */
  count: number;
  positions: number[];
  /** Robada y japonesa: espaciado uniforme entre huecos. */
  spacing: number | null;
  /** Francesa: cantidad de X, ancho de cada X y separación entre X. */
  sets: number | null;
  xWidth: number | null;
  betweenGap: number | null;
  /** Japonesa: distancia del borde de la hoja a la línea de huecos. */
  edgeMargin: number | null;
  leftover: number;
}

export type GuideResult =
  | { ok: true; sheets: Sheet[]; summary: GuideSummary; warnings: string[] }
  | { ok: false; error: string };

/** Hoja física y largo del lomo según el tamaño elegido y su interpretación. */
export function sheetDimensions(paper: PaperId, sizeMode: SizeMode) {
  const sheetPaper = PAPERS[sizeMode === 'sheet' ? paper : UNFOLDED_OF[paper]];
  // La hoja se dibuja apaisada: el pliegue es vertical y recorre el lado corto.
  const width = Math.max(sheetPaper.width, sheetPaper.height);
  const height = Math.min(sheetPaper.width, sheetPaper.height);
  return { width, height, spineLength: height, paperLabel: sheetPaper.label };
}

/** Dimensiones de la página de la japonesa según el tamaño y la orientación elegidos. */
export function pageDimensions(paper: PaperId, orientation: Orientation) {
  const { width: w, height: h, label } = PAPERS[paper];
  const long = Math.max(w, h);
  const short = Math.min(w, h);
  return orientation === 'horizontal'
    ? { width: long, height: short, paperLabel: label }
    : { width: short, height: long, paperLabel: label };
}

function commonWarnings(holeDiameter: number, minGap: number, leftover: number): string[] {
  const warnings: string[] = [];
  if (holeDiameter >= minGap) {
    warnings.push('El diámetro de la marca es mayor o igual que la distancia entre huecos: las marcas se solapan.');
  }
  if (leftover > 0.05) {
    warnings.push(
      `Sobran ${fmt(leftover, 2)} mm entre el último hueco y el margen de pie. ` +
        'Activa «Distribuir» para repartirlos entre los huecos.',
    );
  }
  return warnings;
}

/**
 * Francesa: conjuntos (X) de dos huecos, con la misma separación entre X que el
 * ancho de la X (o una medida propia). Robada: huecos equiespaciados en número par.
 * Japonesa: huecos equiespaciados en número impar, a un costado de la hoja.
 */
export function buildGuide(form: GuideForm): GuideResult {
  if (form.binding === 'japonesa') return buildJapanese(form);

  const { width, height, spineLength, paperLabel } = sheetDimensions(form.paper, form.sizeMode);

  if (!Number.isFinite(form.holeDiameter) || form.holeDiameter <= 0) {
    return { ok: false, error: 'El diámetro de la marca debe ser mayor que 0.' };
  }

  let positions: number[];
  let sets: [number, number][] | undefined;
  let leftover: number;
  let minGap: number;
  let info: string[];
  let summaryPart: Pick<GuideSummary, 'spacing' | 'sets' | 'xWidth' | 'betweenGap'>;

  const margins = `Cabeza ${fmt(form.headMargin)} mm · pie ${fmt(form.tailMargin)} mm`;

  if (form.binding === 'francesa') {
    const r = computeSets({
      spineLength,
      headMargin: form.headMargin,
      tailMargin: form.tailMargin,
      mode: form.mode,
      sets: form.sets,
      xWidth: form.xWidth,
      betweenGap: form.betweenGap,
      linked: form.linked,
      distribute: form.distribute,
    });
    if (!r.ok) return r;
    positions = r.positions;
    sets = r.sets;
    leftover = r.leftover;
    minGap = r.setCount > 1 ? Math.min(r.xWidth, r.betweenGap) : r.xWidth;
    summaryPart = {
      spacing: null,
      sets: r.setCount,
      xWidth: r.xWidth,
      betweenGap: r.setCount > 1 ? r.betweenGap : null,
    };
    info = [
      `Hoja ${paperLabel} · lomo ${fmt(spineLength)} mm`,
      `${r.setCount} conjuntos (X) · ${positions.length} huecos`,
      `Ancho de X ${fmt(r.xWidth, 2)} mm` + (r.setCount > 1 ? ` · entre X ${fmt(r.betweenGap, 2)} mm` : ''),
      margins,
    ];
  } else {
    const r = computeStations({
      spineLength,
      headMargin: form.headMargin,
      tailMargin: form.tailMargin,
      mode: form.mode,
      count: form.count,
      spacing: form.spacing,
      distribute: form.distribute,
      parity: 'even',
    });
    if (!r.ok) return r;
    positions = r.positions;
    leftover = r.leftover;
    minGap = r.count > 1 ? r.spacing : Infinity;
    summaryPart = { spacing: r.count > 1 ? r.spacing : null, sets: null, xWidth: null, betweenGap: null };
    info = [
      `Hoja ${paperLabel} · lomo ${fmt(spineLength)} mm`,
      `${r.count} huecos` + (r.count > 1 ? ` · cada ${fmt(r.spacing, 2)} mm` : ''),
      margins,
    ];
  }

  const label = form.binding === 'robada' ? 'Encuadernación robada (alternada)' : 'Encuadernación francesa';
  const sheet = buildSheet({
    width,
    height,
    positions,
    sets,
    holeDiameter: form.holeDiameter,
    showDimensions: form.showDimensions,
    label,
    info,
  });

  return {
    ok: true,
    sheets: [sheet],
    warnings: commonWarnings(form.holeDiameter, minGap, leftover),
    summary: {
      spineLength,
      sheetWidth: width,
      sheetHeight: height,
      paperLabel,
      count: positions.length,
      positions,
      leftover,
      edgeMargin: null,
      ...summaryPart,
    },
  };
}

/**
 * Japonesa: la costura va al costado. Los huecos (número impar, equiespaciados) están en
 * una línea paralela a un borde de la hoja; la misma plantilla sirve para las páginas y la tapa.
 */
function buildJapanese(form: GuideForm): GuideResult {
  const { width, height, paperLabel } = pageDimensions(form.paper, form.orientation);

  if (!Number.isFinite(form.holeDiameter) || form.holeDiameter <= 0) {
    return { ok: false, error: 'El diámetro de la marca debe ser mayor que 0.' };
  }
  if (!Number.isFinite(form.edgeMargin) || form.edgeMargin < 0) {
    return { ok: false, error: 'Indica el margen del borde a los huecos (0 o más).' };
  }
  if (form.edgeMargin <= form.holeDiameter / 2) {
    return { ok: false, error: 'El margen del borde debe ser mayor que el radio de la marca; si no, el hueco queda fuera de la hoja.' };
  }
  if (form.edgeMargin >= width) {
    return { ok: false, error: 'El margen del borde es mayor que el ancho de la hoja.' };
  }

  const r = computeStations({
    spineLength: height,
    headMargin: form.headMargin,
    tailMargin: form.tailMargin,
    mode: form.mode,
    count: form.count,
    spacing: form.spacing,
    distribute: form.distribute,
    parity: 'odd',
  });
  if (!r.ok) return r;

  const minGap = r.count > 1 ? r.spacing : Infinity;
  const warnings = commonWarnings(form.holeDiameter, minGap, r.leftover);
  if (form.edgeMargin >= width / 2) {
    warnings.push('El margen del borde supera la mitad del ancho de la hoja: revisa que sea el valor correcto.');
  }

  const orientation = form.orientation === 'horizontal' ? 'horizontal' : 'vertical';
  const sheet = buildSheet({
    width,
    height,
    positions: r.positions,
    holeDiameter: form.holeDiameter,
    showDimensions: form.showDimensions,
    label: 'Encuadernación japonesa',
    info: [
      `Hoja ${paperLabel} ${orientation} · costura al lado ${form.bindingSide}`,
      `${r.count} huecos` + (r.count > 1 ? ` · cada ${fmt(r.spacing, 2)} mm` : ''),
      `Borde ${fmt(form.edgeMargin)} mm · superior ${fmt(form.headMargin)} mm · inferior ${fmt(form.tailMargin)} mm`,
      'Esta plantilla sirve también para la tapa',
    ],
    layout: { kind: 'edge', side: form.bindingSide, margin: form.edgeMargin },
  });

  return {
    ok: true,
    sheets: [sheet],
    warnings,
    summary: {
      spineLength: height,
      sheetWidth: width,
      sheetHeight: height,
      paperLabel,
      count: r.count,
      positions: r.positions,
      spacing: r.count > 1 ? r.spacing : null,
      sets: null,
      xWidth: null,
      betweenGap: null,
      edgeMargin: form.edgeMargin,
      leftover: r.leftover,
    },
  };
}
