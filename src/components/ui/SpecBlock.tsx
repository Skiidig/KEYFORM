import React from 'react';

interface SpecBlockProps {
  label: string;
  value: string;
  note?: string;
  classification?: 'standard' | 'concept';
}

export const SpecBlock: React.FC<SpecBlockProps> = ({
  label,
  value,
  note,
  classification,
}) => (
  <div className="kf-spec-block">
    <span className="kf-spec-block__label">{label}</span>
    <span className="kf-spec-block__value">{value}</span>
    {note && <span className="kf-spec-block__note">{note}</span>}
    {classification && (
      <span
        className={`kf-spec-tag ${classification === 'concept' ? 'kf-spec-tag--concept' : ''}`}
      >
        {classification === 'standard' ? 'Verified Industry Standard' : 'Fictional KF—01 Concept'}
      </span>
    )}
  </div>
);
