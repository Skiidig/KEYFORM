import React from 'react';
import { MATERIALS_LIBRARY } from '../../data/kf01Data';
import { useReveal } from '../../motion/useReveal';
import { ResponsiveImage } from '../ui/ResponsiveImage';

export const MaterialLibrary: React.FC = () => {
  const { ref, revealed } = useReveal<HTMLDivElement>();

  return (
    <section
      id="materials"
      className="kf-section env-form-function"
      aria-labelledby="materials-heading"
    >
      <div className="kf-container">
        <header className="kf-section-head">
          <div className="kf-section-head__title">
            <p className="kf-eyebrow">
              <span className="kf-eyebrow-index">05</span>
              <span className="kf-datum-tick" aria-hidden="true" />
              <span>Material Library</span>
            </p>
            <h2 id="materials-heading" className="kf-h1">
              Material matters.
            </h2>
          </div>
          <div className="kf-section-head__summary">
            <p className="kf-body">
              Four materials chosen for tactile honesty, quiet durability, and restrained surface
              contrast before you compose your build.
            </p>
          </div>
        </header>

        <div
          ref={ref}
          className={`kf-materials kf-reveal ${revealed ? 'kf-reveal--visible' : ''}`}
        >
          {MATERIALS_LIBRARY.map((item, idx) => (
            <article
              key={item.id}
              className={`kf-material-plate kf-material-plate--${idx === 0 || idx === 3 ? 'wide' : 'focused'}`}
            >
              <div className="kf-material-plate__visual">
                <ResponsiveImage
                  shotId={item.shotId}
                  sizes="(min-width: 1024px) 52vw, 100vw"
                />
              </div>

              <div className="kf-material-plate__meta">
                <span className="kf-material-plate__index">{item.index}</span>
                <span className="kf-material-plate__role">{item.role}</span>
              </div>

              <div>
                <h3 className="kf-h2" style={{ marginBottom: '10px' }}>
                  {item.name}
                </h3>
                <p className="kf-body">{item.description}</p>
              </div>

              <div className="kf-material-plate__specs">
                {item.specs.map((spec) => (
                  <span key={spec}>{spec}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
