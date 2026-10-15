/** Tamaños de papel en mm, en vertical (ancho × alto). */
export type PaperId = 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'Carta' | 'Tabloide';

export interface Paper {
  id: PaperId;
  label: string;
  width: number;
  height: number;
}

export const PAPERS: Record<PaperId, Paper> = {
  A2: { id: 'A2', label: 'A2', width: 420, height: 594 },
  A3: { id: 'A3', label: 'A3', width: 297, height: 420 },
  A4: { id: 'A4', label: 'A4', width: 210, height: 297 },
  A5: { id: 'A5', label: 'A5', width: 148, height: 210 },
  A6: { id: 'A6', label: 'A6', width: 105, height: 148 },
  Carta: { id: 'Carta', label: 'Carta', width: 215.9, height: 279.4 },
  Tabloide: { id: 'Tabloide', label: 'Tabloide', width: 279.4, height: 431.8 },
};

/** Tamaños que el usuario puede elegir en el selector. */
export const SELECTABLE_PAPERS: PaperId[] = ['A3', 'A4', 'A5', 'A6', 'Carta'];

/** Hoja que resulta de desplegar una página de cada tamaño (A5 -> A4, etc.). */
export const UNFOLDED_OF: Record<PaperId, PaperId> = {
  A2: 'A2',
  A3: 'A2',
  A4: 'A3',
  A5: 'A4',
  A6: 'A5',
  Carta: 'Tabloide',
  Tabloide: 'Tabloide',
};
