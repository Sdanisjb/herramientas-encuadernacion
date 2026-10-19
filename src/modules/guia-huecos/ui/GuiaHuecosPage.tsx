import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { downloadBlob } from '../../../core/download';
import { fmt } from '../../../core/format';
import { SELECTABLE_PAPERS, PAPERS } from '../../../core/paper';
import { sheetsToPdfBlob } from '../../../core/pdf';
import { sheetToSvg } from '../../../core/svg';
import { BINDING_LABEL, DEFAULT_FORM, buildGuide, type GuideForm } from '../geometry/guide';
import { formToParams, loadStoredForm, paramsToForm, storeForm } from '../state';
import { NumberField } from './NumberField';

const BINDING_HINT: Record<GuideForm['binding'], string> = {
  francesa: 'Conjuntos (X) de dos huecos, con la misma separación entre X que el ancho de cada X (o la medida que fijes).',
  robada: 'Un único patrón de huecos equiespaciados, en número par, con márgenes de cabeza y pie por separado.',
  japonesa:
    'La costura va al costado: huecos equiespaciados, en número impar, en una línea paralela al borde. La misma plantilla sirve para las páginas y la tapa.',
};

export default function GuiaHuecosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState<GuideForm>(() =>
    searchParams.toString() ? paramsToForm(searchParams) : (loadStoredForm() ?? DEFAULT_FORM),
  );
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof GuideForm>(key: K, value: GuideForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // La robada necesita número par y la japonesa impar: al elegirlas se ajusta el número de huecos.
  const setBinding = (binding: GuideForm['binding']) =>
    setForm((f) => {
      let count = f.count;
      if (Number.isFinite(count)) {
        if (binding === 'robada' && count % 2 !== 0) count += 1;
        if (binding === 'japonesa' && count % 2 === 0) count = Math.max(1, count - 1);
      }
      return { ...f, binding, count };
    });

  useEffect(() => {
    setSearchParams(formToParams(form), { replace: true });
    storeForm(form);
  }, [form, setSearchParams]);

  const guide = useMemo(() => buildGuide(form), [form]);
  const svgs = useMemo(() => (guide.ok ? guide.sheets.map(sheetToSvg) : []), [guide]);

  const variant =
    form.binding === 'japonesa' ? form.orientation : form.sizeMode === 'sheet' ? 'hoja' : 'pagina';
  const baseName = `guia-${form.binding}-${form.paper}-${variant}`;

  const exportPdf = async () => {
    if (!guide.ok) return;
    setBusy(true);
    try {
      const blob = await sheetsToPdfBlob(guide.sheets, `Guía de huecos · ${BINDING_LABEL[form.binding]}`);
      downloadBlob(blob, `${baseName}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  const exportSvg = () => {
    svgs.forEach((svg, i) => {
      const suffix = svgs.length > 1 ? `-${i + 1}` : '';
      downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${baseName}${suffix}.svg`);
    });
  };

  const pageStyle = guide.ok
    ? `@page { size: ${guide.summary.sheetWidth}mm ${guide.summary.sheetHeight}mm; margin: 0; }`
    : '';

  return (
    <div className="tool">
      <style>{pageStyle}</style>

      <form className="panel" onSubmit={(e) => e.preventDefault()} aria-label="Parámetros de la plantilla">
        <h1>Guía de huecos</h1>

        <fieldset>
          <legend>Encuadernación</legend>
          <div className="segmented" role="radiogroup" aria-label="Tipo de encuadernación">
            {(['francesa', 'robada', 'japonesa'] as const).map((b) => (
              <label key={b} className={form.binding === b ? 'is-on' : ''}>
                <input type="radio" name="binding" checked={form.binding === b} onChange={() => setBinding(b)} />
                {BINDING_LABEL[b]}
              </label>
            ))}
          </div>
          <p className="hint">{BINDING_HINT[form.binding]}</p>
        </fieldset>

        <fieldset>
          <legend>Papel</legend>
          <label className="field">
            <span>Tamaño</span>
            <select value={form.paper} onChange={(e) => set('paper', e.target.value as GuideForm['paper'])}>
              {SELECTABLE_PAPERS.map((id) => (
                <option key={id} value={id}>
                  {PAPERS[id].label} ({fmt(PAPERS[id].width)} × {fmt(PAPERS[id].height)} mm)
                </option>
              ))}
            </select>
          </label>
          {form.binding === 'japonesa' ? (
            <>
              <div className="segmented" role="radiogroup" aria-label="Orientación de la hoja">
                <label className={form.orientation === 'horizontal' ? 'is-on' : ''}>
                  <input type="radio" name="orientation" checked={form.orientation === 'horizontal'} onChange={() => set('orientation', 'horizontal')} />
                  Horizontal
                </label>
                <label className={form.orientation === 'vertical' ? 'is-on' : ''}>
                  <input type="radio" name="orientation" checked={form.orientation === 'vertical'} onChange={() => set('orientation', 'vertical')} />
                  Vertical
                </label>
              </div>
              <div className="segmented" role="radiogroup" aria-label="Lado de la encuadernación">
                <label className={form.bindingSide === 'izquierdo' ? 'is-on' : ''}>
                  <input type="radio" name="bindingSide" checked={form.bindingSide === 'izquierdo'} onChange={() => set('bindingSide', 'izquierdo')} />
                  Costura a la izquierda
                </label>
                <label className={form.bindingSide === 'derecho' ? 'is-on' : ''}>
                  <input type="radio" name="bindingSide" checked={form.bindingSide === 'derecho'} onChange={() => set('bindingSide', 'derecho')} />
                  Costura a la derecha
                </label>
              </div>
              <p className="hint">Se imprime en una hoja del tamaño de la página; los huecos van a lo largo del lado vertical elegido.</p>
            </>
          ) : (
            <>
              <div className="segmented" role="radiogroup" aria-label="Interpretación del tamaño">
                <label className={form.sizeMode === 'sheet' ? 'is-on' : ''}>
                  <input type="radio" name="sizeMode" checked={form.sizeMode === 'sheet'} onChange={() => set('sizeMode', 'sheet')} />
                  Hoja sin plegar
                </label>
                <label className={form.sizeMode === 'page' ? 'is-on' : ''}>
                  <input type="radio" name="sizeMode" checked={form.sizeMode === 'page'} onChange={() => set('sizeMode', 'page')} />
                  Página del libro
                </label>
              </div>
              <p className="hint">
                {form.sizeMode === 'sheet'
                  ? 'Se imprime en una hoja de ese tamaño; el lomo mide el lado corto.'
                  : 'El tamaño es el de la página ya plegada; la hoja a imprimir es el tamaño siguiente.'}
              </p>
            </>
          )}
        </fieldset>

        <fieldset>
          <legend>Huecos</legend>
          <div className="segmented" role="radiogroup" aria-label="Cómo definir los huecos">
            <label className={form.mode === 'count' ? 'is-on' : ''}>
              <input type="radio" name="mode" checked={form.mode === 'count'} onChange={() => set('mode', 'count')} />
              {form.binding === 'francesa' ? 'Cantidad de X' : 'Número de huecos'}
            </label>
            <label className={form.mode === 'spacing' ? 'is-on' : ''}>
              <input type="radio" name="mode" checked={form.mode === 'spacing'} onChange={() => set('mode', 'spacing')} />
              {form.binding === 'francesa' ? 'Medidas exactas' : 'Espaciado'}
            </label>
          </div>

          {form.binding === 'francesa' ? (
            <>
              {form.mode === 'count' ? (
                <NumberField label="Cantidad de conjuntos (X)" value={form.sets} step={1} min={1} unit="" onChange={(v) => set('sets', v)} />
              ) : (
                <NumberField label="Ancho de cada X" value={form.xWidth} step={0.5} min={0.5} onChange={(v) => set('xWidth', v)} />
              )}
              <label className="check">
                <input type="checkbox" checked={form.linked} onChange={(e) => set('linked', e.target.checked)} />
                Separación entre X igual al ancho de la X
              </label>
              {!form.linked && (
                <NumberField label="Separación entre X" value={form.betweenGap} step={0.5} min={0.5} onChange={(v) => set('betweenGap', v)} />
              )}
              {form.mode === 'spacing' && (
                <label className="check">
                  <input type="checkbox" checked={form.distribute} onChange={(e) => set('distribute', e.target.checked)} />
                  Distribuir el sobrante entre los conjuntos
                </label>
              )}
              <p className="hint">
                {form.mode === 'count'
                  ? 'Las distancias se calculan para llenar el lomo entre los márgenes.'
                  : 'La cantidad de X sale de cuántas caben entre los márgenes.'}
              </p>
            </>
          ) : form.mode === 'count' ? (
            <NumberField
              label={form.binding === 'japonesa' ? 'Número de huecos (impar)' : 'Número de huecos (par)'}
              value={form.count}
              step={2}
              min={form.binding === 'japonesa' ? 1 : 2}
              unit=""
              onChange={(v) => set('count', v)}
            />
          ) : (
            <>
              <NumberField label="Espaciado entre huecos" value={form.spacing} step={0.5} min={0.5} onChange={(v) => set('spacing', v)} />
              <label className="check">
                <input type="checkbox" checked={form.distribute} onChange={(e) => set('distribute', e.target.checked)} />
                Distribuir el sobrante entre los huecos
              </label>
              <p className="hint">
                {form.binding === 'japonesa'
                  ? 'Si con ese espaciado caben huecos pares, se descarta el último para quedar en impar.'
                  : 'Si con ese espaciado caben huecos impares, se descarta el último para quedar en par.'}
              </p>
            </>
          )}
          {form.binding === 'japonesa' && (
            <NumberField label="Margen del borde a los huecos" value={form.edgeMargin} step={0.5} min={0.5} onChange={(v) => set('edgeMargin', v)} />
          )}
          <div className="row">
            <NumberField
              label={form.binding === 'japonesa' ? 'Margen superior' : 'Margen de cabeza'}
              value={form.headMargin}
              min={0}
              onChange={(v) => set('headMargin', v)}
            />
            <NumberField
              label={form.binding === 'japonesa' ? 'Margen inferior' : 'Margen de pie'}
              value={form.tailMargin}
              min={0}
              onChange={(v) => set('tailMargin', v)}
            />
          </div>
          <p className="hint">
            {form.binding === 'japonesa'
              ? 'Distancia del borde superior de la hoja al primer hueco y del último hueco al borde inferior.'
              : 'Distancia del primer y del último hueco al borde del lomo.'}
          </p>
        </fieldset>

        <fieldset>
          <legend>Marcas</legend>
          <NumberField label="Diámetro de la marca" value={form.holeDiameter} step={0.1} min={0.2} onChange={(v) => set('holeDiameter', v)} />
          <label className="check">
            <input type="checkbox" checked={form.showDimensions} onChange={(e) => set('showDimensions', e.target.checked)} />
            Mostrar numeración, cotas y distancias entre huecos
          </label>
        </fieldset>

        <button type="button" className="link-btn" onClick={() => setForm(DEFAULT_FORM)}>
          Restablecer valores
        </button>
      </form>

      <section className="result" aria-live="polite">
        {!guide.ok ? (
          <p className="alert" role="alert">
            {guide.error}
          </p>
        ) : (
          <>
            <div className="summary">
              <dl>
                <div>
                  <dt>Huecos</dt>
                  <dd>{guide.summary.count}</dd>
                </div>
                {guide.summary.sets !== null ? (
                  <>
                    <div>
                      <dt>Conjuntos (X)</dt>
                      <dd>{guide.summary.sets}</dd>
                    </div>
                    <div>
                      <dt>Ancho de X</dt>
                      <dd>{fmt(guide.summary.xWidth ?? 0, 2)} mm</dd>
                    </div>
                    <div>
                      <dt>Entre X</dt>
                      <dd>{guide.summary.betweenGap !== null ? `${fmt(guide.summary.betweenGap, 2)} mm` : '—'}</dd>
                    </div>
                  </>
                ) : (
                  <div>
                    <dt>Espaciado</dt>
                    <dd>{guide.summary.spacing !== null ? `${fmt(guide.summary.spacing, 2)} mm` : '—'}</dd>
                  </div>
                )}
                {guide.summary.edgeMargin !== null ? (
                  <div>
                    <dt>Borde a huecos</dt>
                    <dd>{fmt(guide.summary.edgeMargin, 2)} mm</dd>
                  </div>
                ) : (
                  <div>
                    <dt>Lomo</dt>
                    <dd>{fmt(guide.summary.spineLength)} mm</dd>
                  </div>
                )}
                <div>
                  <dt>Hoja</dt>
                  <dd>
                    {guide.summary.paperLabel} · {fmt(guide.summary.sheetWidth)} × {fmt(guide.summary.sheetHeight)}
                  </dd>
                </div>
              </dl>
              <div className="actions">
                <button type="button" className="btn primary" onClick={exportPdf} disabled={busy}>
                  {busy ? 'Generando…' : 'Descargar PDF'}
                </button>
                <button type="button" className="btn" onClick={exportSvg}>
                  Descargar SVG
                </button>
                <button type="button" className="btn" onClick={() => window.print()}>
                  Imprimir
                </button>
              </div>
            </div>

            {guide.warnings.map((w) => (
              <p key={w} className="warning" role="status">
                {w}
              </p>
            ))}

            <div className="sheets">
              {svgs.map((svg, i) => (
                <figure className="sheet" key={guide.sheets[i].label}>
                  <figcaption>{guide.sheets[i].label}</figcaption>
                  <div className="sheet-svg" dangerouslySetInnerHTML={{ __html: svg }} />
                </figure>
              ))}
            </div>
            <p className="hint">
              Para que las medidas sean exactas, imprime el PDF al 100 % (tamaño real) y comprueba la barra de escala con una regla.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
