import type { DrawOp, Sheet } from '../../../core/draw';
import { fmt } from '../../../core/format';

export interface SheetInput {
  width: number;
  /** Alto de la hoja = largo del lomo (el pliegue es vertical). */
  height: number;
  /** Posiciones de los huecos en mm desde el borde de cabeza. */
  positions: number[];
  /** Conjuntos (X) como pares de posiciones; solo en la francesa. */
  sets?: [number, number][];
  holeDiameter: number;
  showDimensions: boolean;
  label: string;
  /** Líneas de información que se imprimen en la mitad izquierda. */
  info: string[];
}

const BAR_MM = 50;
const SIDE = 8;
/** Distancia mínima entre huecos para escribir su cota sin que se solape. */
const MIN_LABEL_GAP = 3.2;

/**
 * Dibuja una guía: el lomo (pliegue) vertical en el centro de la hoja, con una
 * marca por hueco. A la izquierda del pliegue van las cotas (margen de cabeza,
 * distancia entre huecos y margen de pie); a la derecha, la posición acumulada
 * y las llaves de cada conjunto. La información y la barra de escala van en la
 * mitad izquierda.
 */
export function buildSheet(input: SheetInput): Sheet {
  const { width, height, positions, sets, holeDiameter, showDimensions, label, info } = input;
  const fold = width / 2;
  const r = holeDiameter / 2;
  const tick = r + 2.5;
  const ops: DrawOp[] = [];

  // Pliegue
  ops.push({ t: 'line', x1: fold, y1: 0, x2: fold, y2: height, ink: 'muted', width: 0.2, dash: [2, 1.5] });

  // Huecos
  positions.forEach((y, i) => {
    ops.push({ t: 'circle', cx: fold, cy: y, r, ink: 'ink', width: 0.25 });
    ops.push({ t: 'line', x1: fold - tick, y1: y, x2: fold + tick, y2: y, ink: 'ink', width: 0.25 });
    if (showDimensions) {
      ops.push({ t: 'text', x: fold - tick - 1, y: y + 0.8, text: String(i + 1), size: 2.4, ink: 'muted', anchor: 'end' });
      ops.push({ t: 'text', x: fold + tick + 1, y: y + 0.8, text: `${fmt(y, 2)} mm`, size: 2.4, ink: 'muted', anchor: 'start' });
    }
  });

  if (showDimensions && positions.length > 0) {
    // Cotas a la izquierda del pliegue: márgenes y distancia entre huecos consecutivos.
    const dimX = fold - tick - 9;
    const dim = (y1: number, y2: number, ink: 'ink' | 'muted') => {
      ops.push({ t: 'line', x1: dimX, y1, x2: dimX, y2, ink, width: 0.2 });
      ops.push({ t: 'line', x1: dimX - 1, y1, x2: dimX + 1, y2: y1, ink, width: 0.2 });
      ops.push({ t: 'line', x1: dimX - 1, y1: y2, x2: dimX + 1, y2, ink, width: 0.2 });
      const d = y2 - y1;
      if (d >= MIN_LABEL_GAP) {
        ops.push({ t: 'text', x: dimX - 1.8, y: (y1 + y2) / 2 + 0.8, text: `${fmt(d, 2)} mm`, size: 2.4, ink, anchor: 'end' });
      }
    };

    const first = positions[0];
    const last = positions[positions.length - 1];
    dim(0, first, 'muted'); // margen de cabeza
    for (let i = 0; i < positions.length - 1; i++) dim(positions[i], positions[i + 1], 'ink');
    dim(last, height, 'muted'); // margen de pie

    // Llaves de los conjuntos (X) a la derecha de la posición acumulada
    if (sets) {
      const bx = fold + tick + 17;
      sets.forEach(([y1, y2], i) => {
        ops.push({ t: 'line', x1: bx, y1, x2: bx, y2, ink: 'ink', width: 0.3 });
        ops.push({ t: 'line', x1: bx - 1.2, y1, x2: bx, y2: y1, ink: 'ink', width: 0.3 });
        ops.push({ t: 'line', x1: bx - 1.2, y1: y2, x2: bx, y2, ink: 'ink', width: 0.3 });
        ops.push({ t: 'text', x: bx + 1.5, y: (y1 + y2) / 2 + 0.8, text: `X${i + 1}`, size: 2.4, ink: 'ink', anchor: 'start', bold: true });
      });
    }
  }

  // Información (mitad izquierda)
  let y = SIDE + 4;
  ops.push({ t: 'text', x: SIDE, y, text: label, size: 4.2, ink: 'ink', anchor: 'start', bold: true });
  for (const line of info) {
    y += 4.6;
    ops.push({ t: 'text', x: SIDE, y, text: line, size: 2.7, ink: 'muted', anchor: 'start' });
  }

  // Barra de escala (solo si cabe en la mitad izquierda)
  if (fold >= SIDE + BAR_MM + SIDE) {
    const by = height - SIDE;
    ops.push({ t: 'text', x: SIDE, y: by - 5.5, text: 'Imprimir al 100 %, sin ajustar a la página', size: 2.4, ink: 'muted', anchor: 'start' });
    ops.push({ t: 'line', x1: SIDE, y1: by, x2: SIDE + BAR_MM, y2: by, ink: 'ink', width: 0.4 });
    ops.push({ t: 'line', x1: SIDE, y1: by - 1.5, x2: SIDE, y2: by + 1.5, ink: 'ink', width: 0.4 });
    ops.push({ t: 'line', x1: SIDE + BAR_MM, y1: by - 1.5, x2: SIDE + BAR_MM, y2: by + 1.5, ink: 'ink', width: 0.4 });
    ops.push({ t: 'text', x: SIDE + BAR_MM / 2, y: by - 2.2, text: `${BAR_MM} mm`, size: 2.4, ink: 'ink', anchor: 'middle' });
  }

  return { width, height, ops, label };
}
