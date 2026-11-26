import React, { useState } from 'react';

export interface AccordionEntry {
  id: string;
  index: string;
  title: string;
  content: string;
}

interface AccordionProps {
  items: AccordionEntry[];
  defaultOpenId?: string;
}

export const Accordion: React.FC<AccordionProps> = ({ items, defaultOpenId }) => {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);

  return (
    <div className="kf-accordion">
      {items.map((item) => {
        const isOpen = openId === item.id;
        const panelId = `kf-acc-panel-${item.id}`;
        const triggerId = `kf-acc-trigger-${item.id}`;

        return (
          <div key={item.id} className="kf-accordion__item">
            <h3 style={{ margin: 0 }}>
              <button
                id={triggerId}
                type="button"
                className="kf-accordion__trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : item.id)}
              >
                <span className="kf-accordion__title-group">
                  <span className="kf-accordion__index">{item.index}</span>
                  <span className="kf-accordion__title">{item.title}</span>
                </span>
                <span className="kf-accordion__icon" aria-hidden="true">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
            </h3>
            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className="kf-accordion__panel"
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
