import { useId } from 'react';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  unit?: string;
}

/** Campo numérico controlado; un campo vacío se propaga como NaN y la validación lo señala. */
export function NumberField({ label, value, onChange, step = 0.5, min, unit = 'mm' }: Props) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <span className="input-unit">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.valueAsNumber)}
        />
        {unit && <span aria-hidden="true">{unit}</span>}
      </span>
    </label>
  );
}
