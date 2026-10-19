import type { DrawOp, Ink, Sheet } from '../../../core/draw';
import { fmt } from '../../../core/format';

/**
 * Disposición de la línea de huecos:
 * - `fold`: el pliegue (lomo) vertical en el centro de la hoja.
 * - `edge`: línea paralela a un borde, a `margin` mm de él (japonesa).
 */
export type SheetLayout = { kind: 'fold' } | { kind: 'edge'; side: 'izquierdo' | 'derecho'; margin: number };

export interface SheetInput {
  width: number;
  /** Alto de la hoja = largo de la línea de huecos. */
  height: number;
  /** Posiciones de los huecos en mm desde el borde superior. */
  positions: number[];
  /** Conjuntos (X) como pares de posiciones; solo en la francesa. */
  sets?: [number, number][];
  holeDiameter: number;
  showDimensions: boolean;
  label: string;
  /** Líneas de información (la primera tras el título). */
  info: string[];
  layout?: SheetLayout;
}

/** Largos posibles de la barra de escala, de mayor a menor (mm). */
const BAR_LENGTHS = [50, 25];
const SIDE = 8;
/** Distancia de la columna de cotas a la línea de huecos (más allá de la marca), dejando sitio a la posición acumulada. */
const EDGE_DIM_OFFSET = 24;
/** Distancia mínima entre huecos para escribir su cota sin que se solape. */
const MIN_LABEL_GAP = 3.2;
/** Anchura aproximada de un carácter respecto al tamaño de fuente (Helvetica). */
const CHAR_W = 0.5;
const CHAR_W_BOLD = 0.58;
/** Por debajo de este tamaño (mm) un texto se omite en lugar de encogerlo. */
const MIN_TEXT_SIZE = 1.8;

/** Tamaño de fuente al que `text` cabe en `available` mm (el nominal si ya cabe; 0 si no cabe). */
function fitSize(text: string, nominal: number, available: number, bold = false): number {
  const w = text.length * (bold ? CHAR_W_BOLD : CHAR_W);
  const size = Math.min(nominal, available / w);
  return size >= MIN_TEXT_SIZE ? size : 0;
}

/**
 * Dibuja una guía con una línea vertical de huecos y una marca por hueco.
 * Las cotas (margen superior, distancia entre huecos, margen inferior) y la
 * numeración se dibujan hacia el lado con espacio; la información y la barra de
 * escala ocupan el resto de la hoja.
 */
export function buildSheet(input: SheetInput): Sheet {
  const { width, height, positions, sets, holeDiameter, showDimensions, label, info } = input;
  const layout: SheetLayout = input.layout ?? { kind: 'fold' };
  const r = holeDiameter / 2;
  const tick = r + 2.5;
  const ops: DrawOp[] = [];

  // Lado hacia el que se escriben textos y cotas: -1 izquierda, +1 derecha.
  const isEdge = layout.kind === 'edge';
  const axis = isEdge ? (layout.side === 'izquierdo' ? layout.margin : width - layout.margin) : width / 2;
  const interior = isEdge ? (layout.side === 'izquierdo' ? 1 : -1) : null;
  const anchorFor = (dir: number): 'start' | 'end' => (dir > 0 ? 'start' : 'end');

  // Línea de huecos (pliegue o línea de costura)
  ops.push({ t: 'line', x1: axis, y1: 0, x2: axis, y2: height, ink: 'muted', width: 0.2, dash: [2, 1.5] });

  // Huecos
  positions.forEach((y, i) => {
    ops.push({ t: 'circle', cx: axis, cy: y, r, ink: 'ink', width: 0.25 });
    ops.push({ t: 'line', x1: axis - tick, y1: y, x2: axis + tick, y2: y, ink: 'ink', width: 0.25 });
    if (!showDimensions) return;
    const idx = interior ?? -1; // en el pliegue, el número va a la izquierda
    const pos = interior ?? 1; // y la posición a la derecha
    const idxX = axis + idx * (tick + 1);
    const posX = interior ? axis + interior * (tick + 6.5) : axis + tick + 1;
    ops.push({ t: 'text', x: idxX, y: y + 0.8, text: String(i + 1), size: 2.4, ink: 'muted', anchor: anchorFor(idx) });
    ops.push({ t: 'text', x: posX, y: y + 0.8, text: `${fmt(y, 2)} mm`, size: 2.4, ink: 'muted', anchor: anchorFor(pos) });
  });

  // Cotas verticales: margen superior, distancia entre huecos consecutivos y margen inferior
  const dimDir = interior ?? -1;
  const dimX = isEdge ? axis + dimDir * (tick + EDGE_DIM_OFFSET) : axis - tick - 9;
  if (showDimensions && positions.length > 0) {
    const dim = (y1: number, y2: number, ink: Ink) => {
      ops.push({ t: 'line', x1: dimX, y1, x2: dimX, y2, ink, width: 0.2 });
      ops.push({ t: 'line', x1: dimX - 1, y1, x2: dimX + 1, y2: y1, ink, width: 0.2 });
      ops.push({ t: 'line', x1: dimX - 1, y1: y2, x2: dimX + 1, y2, ink, width: 0.2 });
      const d = y2 - y1;
      if (d >= MIN_LABEL_GAP) {
        ops.push({ t: 'text', x: dimX + dimDir * 1.8, y: (y1 + y2) / 2 + 0.8, text: `${fmt(d, 2)} mm`, size: 2.4, ink, anchor: anchorFor(dimDir) });
      }
    };
    const first = positions[0];
    const last = positions[positions.length - 1];
    dim(0, first, 'muted');
    for (let i = 0; i < positions.length - 1; i++) dim(positions[i], positions[i + 1], 'ink');
    dim(last, height, 'muted');

    // Llaves de los conjuntos (X) a la derecha de la posición acumulada
    if (sets && !isEdge) {
      const bx = axis + tick + 17;
      sets.forEach(([y1, y2], i) => {
        ops.push({ t: 'line', x1: bx, y1, x2: bx, y2, ink: 'ink', width: 0.3 });
        ops.push({ t: 'line', x1: bx - 1.2, y1, x2: bx, y2: y1, ink: 'ink', width: 0.3 });
        ops.push({ t: 'line', x1: bx - 1.2, y1: y2, x2: bx, y2, ink: 'ink', width: 0.3 });
        ops.push({ t: 'text', x: bx + 1.5, y: (y1 + y2) / 2 + 0.8, text: `X${i + 1}`, size: 2.4, ink: 'ink', anchor: 'start', bold: true });
      });
    }

    // Cota horizontal: del borde de la hoja a la línea de huecos
    if (isEdge) {
      const edgeX = layout.side === 'izquierdo' ? 0 : width;
      const y = first;
      ops.push({ t: 'line', x1: edgeX, y1: y, x2: axis, y2: y, ink: 'muted', width: 0.2 });
      ops.push({ t: 'line', x1: edgeX, y1: y - 1, x2: edgeX, y2: y + 1, ink: 'muted', width: 0.2 });
      ops.push({ t: 'line', x1: axis, y1: y - 1, x2: axis, y2: y + 1, ink: 'muted', width: 0.2 });
      ops.push({ t: 'text', x: (edgeX + axis) / 2, y: y - 1.2, text: `${fmt(layout.margin, 2)} mm`, size: 2.4, ink: 'muted', anchor: 'middle' });
    }
  }

  // Zona libre para la información: el lado contrario al de las cotas
  const dimsReach = tick + EDGE_DIM_OFFSET + 16; // desde la línea de huecos hasta el final de los textos de cota
  let infoX: number;
  let available: number;
  if (isEdge && interior === 1) {
    infoX = axis + dimsReach;
    available = width - SIDE - infoX;
  } else {
    infoX = SIDE;
    available = (isEdge ? axis - dimsReach : axis - tick - 25) - SIDE - 2;
  }

  let y = SIDE + 4;
  const titleSize = fitSize(label, 4.2, available, true);
  if (titleSize) ops.push({ t: 'text', x: infoX, y, text: label, size: titleSize, ink: 'ink', anchor: 'start', bold: true });
  // Un único tamaño para todas las líneas: el que permite que la más larga quepa
  const bodySize = Math.min(2.7, ...info.map((line) => available / (line.length * CHAR_W)));
  if (bodySize >= MIN_TEXT_SIZE) {
    for (const line of info) {
      y += 4.6;
      ops.push({ t: 'text', x: infoX, y, text: line, size: bodySize, ink: 'muted', anchor: 'start' });
    }
  }

  // Barra de escala: 50 mm si cabe en la zona libre; en hojas pequeñas, una más corta
  const bar = BAR_LENGTHS.find((mm) => mm <= available);
  if (bar) {
    const by = height - SIDE;
    const note = 'Imprimir al 100 %, sin ajustar a la página';
    const noteSize = fitSize(note, 2.4, available);
    if (noteSize) ops.push({ t: 'text', x: infoX, y: by - 5.5, text: note, size: noteSize, ink: 'muted', anchor: 'start' });
    ops.push({ t: 'line', x1: infoX, y1: by, x2: infoX + bar, y2: by, ink: 'ink', width: 0.4 });
    ops.push({ t: 'line', x1: infoX, y1: by - 1.5, x2: infoX, y2: by + 1.5, ink: 'ink', width: 0.4 });
    ops.push({ t: 'line', x1: infoX + bar, y1: by - 1.5, x2: infoX + bar, y2: by + 1.5, ink: 'ink', width: 0.4 });
    ops.push({ t: 'text', x: infoX + bar / 2, y: by - 2.2, text: `${bar} mm`, size: 2.4, ink: 'ink', anchor: 'middle' });
  }

  return { width, height, ops, label };
}
