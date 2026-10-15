import { SELECTABLE_PAPERS } from '../../core/paper';
import { DEFAULT_FORM, type GuideForm } from './geometry/guide';

const STORAGE_KEY = 'guia-huecos:v1';

const BOOL_KEYS = ['distribute', 'showDimensions', 'linked'] as const;
const NUM_KEYS = ['count', 'spacing', 'sets', 'xWidth', 'betweenGap', 'headMargin', 'tailMargin', 'holeDiameter'] as const;

/** Codifica el formulario como parámetros de URL (enlace compartible). */
export function formToParams(form: GuideForm): URLSearchParams {
  const p = new URLSearchParams();
  p.set('binding', form.binding);
  p.set('paper', form.paper);
  p.set('sizeMode', form.sizeMode);
  p.set('mode', form.mode);
  for (const k of NUM_KEYS) p.set(k, String(form[k]));
  for (const k of BOOL_KEYS) p.set(k, form[k] ? '1' : '0');
  return p;
}

/** Lee un formulario de parámetros de URL, ignorando valores inválidos. */
export function paramsToForm(p: URLSearchParams): GuideForm {
  const form: GuideForm = { ...DEFAULT_FORM };

  const binding = p.get('binding');
  if (binding === 'francesa' || binding === 'robada') form.binding = binding;

  const paper = p.get('paper');
  if (paper && (SELECTABLE_PAPERS as string[]).includes(paper)) form.paper = paper as GuideForm['paper'];

  const sizeMode = p.get('sizeMode');
  if (sizeMode === 'sheet' || sizeMode === 'page') form.sizeMode = sizeMode;

  const mode = p.get('mode');
  if (mode === 'count' || mode === 'spacing') form.mode = mode;

  for (const k of NUM_KEYS) {
    const raw = p.get(k);
    if (raw !== null && raw.trim() !== '') {
      const n = Number(raw);
      if (Number.isFinite(n)) form[k] = n;
    }
  }
  for (const k of BOOL_KEYS) {
    const raw = p.get(k);
    if (raw === '0' || raw === '1') form[k] = raw === '1';
  }
  return form;
}

export function loadStoredForm(): GuideForm | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? paramsToForm(new URLSearchParams(raw)) : null;
  } catch {
    return null;
  }
}

export function storeForm(form: GuideForm): void {
  try {
    localStorage.setItem(STORAGE_KEY, formToParams(form).toString());
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}
