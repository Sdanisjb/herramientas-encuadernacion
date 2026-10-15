import { PAPERS, UNFOLDED_OF, type PaperId } from '../../../core/paper';
import type { Sheet } from '../../../core/draw';
import { fmt } from '../../../core/format';
import { buildSheet } from './sheet';
import { computeSets, computeStations, type CountMode } from './stations';

export type BindingType = 'francesa' | 'robada';
/** "sheet": el tamaño elegido es la hoja sin plegar. "page": es la página del libro ya plegada. */
export type SizeMode = 'sheet' | 'page';

export interface GuideForm {
  binding: BindingType;
  paper: PaperId;
  sizeMode: SizeMode;
  /** 'count': por cantidad (huecos o conjuntos). 'spacing': por medidas exactas. */
  mode: CountMode;
  /** Robada: número de huecos (par). */
  count: number;
  /** Robada: espaciado entre huecos. */
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
  headMargin: number;
  tailMargin: number;
  holeDiameter: number;
  showDimensions: boolean;
}

export const BINDING_LABEL: Record<BindingType, string> = {
  francesa: 'Francesa',
  robada: 'Robada (alternada)',
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
};

export interface GuideSummary {
  spineLength: number;
  sheetWidth: number;
  sheetHeight: number;
  paperLabel: string;
  /** Número total de huecos. */
  count: number;
  positions: number[];
  /** Robada: espaciado uniforme entre huecos. */
  spacing: number | null;
  /** Francesa: cantidad de X, ancho de cada X y separación entre X. */
  sets: number | null;
  xWidth: number | null;
  betweenGap: number | null;
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

/**
 * Francesa: conjuntos (X) de dos huecos, con la misma separación entre X que el
 * ancho de la X (o una medida propia). Robada: huecos equiespaciados en número par.
 */
export function buildGuide(form: GuideForm): GuideResult {
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
      evenOnly: true,
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

  const warnings: string[] = [];
  if (form.holeDiameter >= minGap) {
    warnings.push('El diámetro de la marca es mayor o igual que la distancia entre huecos: las marcas se solapan.');
  }
  if (leftover > 0.05) {
    warnings.push(
      `Sobran ${fmt(leftover, 2)} mm entre el último hueco y el margen de pie. ` +
        'Activa «Distribuir» para repartirlos entre los huecos.',
    );
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
    warnings,
    summary: {
      spineLength,
      sheetWidth: width,
      sheetHeight: height,
      paperLabel,
      count: positions.length,
      positions,
      leftover,
      ...summaryPart,
    },
  };
}
