import React from 'react';
import type { StudioOption } from '../../data/kf01Data';

interface SwatchSelectorProps<TId extends string = string> {
  label: string;
  options: readonly StudioOption<TId>[];
  value: TId;
  onChange: (id: TId) => void;
}

export function SwatchSelector<TId extends string = string>({
  label,
  options,
  value,
  onChange,
}: SwatchSelectorProps<TId>) {
  const selected = options.find((o) => o.id === value);

  return (
    <div className="kf-control-group">
      <div className="kf-control-group__header">
        <span className="kf-control-group__label">{label}</span>
        {selected && <span className="kf-control-group__selected">{selected.name}</span>}
      </div>
      <div className="kf-swatch-grid" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const isSelected = option.id === value;
          const swatchStyle: React.CSSProperties = option.secondaryHex
            ? {
                background: `linear-gradient(135deg, ${option.swatchHex} 50%, ${option.secondaryHex} 50%)`,
              }
            : { backgroundColor: option.swatchHex };

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className="kf-swatch"
              onClick={() => onChange(option.id)}
            >
              <span className="kf-swatch__chip" style={swatchStyle} aria-hidden="true" />
              <span className="kf-swatch__meta">
                <span className="kf-swatch__name">{option.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
