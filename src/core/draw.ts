/**
 * Primitivas de dibujo independientes del formato de salida.
 * Todas las coordenadas están en mm, con el origen arriba a la izquierda.
 * La misma lista de operaciones alimenta la vista previa SVG y el PDF.
 */
export type Ink = 'ink' | 'muted';

export type DrawOp =
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; ink: Ink; width: number; dash?: [number, number] }
  | { t: 'circle'; cx: number; cy: number; r: number; ink: Ink; width: number }
  | { t: 'text'; x: number; y: number; text: string; size: number; ink: Ink; anchor: 'start' | 'middle' | 'end'; bold?: boolean };

export interface Sheet {
  /** Ancho y alto de la hoja en mm. */
  width: number;
  height: number;
  ops: DrawOp[];
  /** Etiqueta corta de la hoja (p. ej. "Patrón A"). */
  label: string;
}

export const INK_RGB: Record<Ink, [number, number, number]> = {
  ink: [17, 17, 17],
  muted: [110, 110, 110],
};
