import React from 'react';
import { getBuildCode, type BuildConfig } from '../../data/kf01Data';
import { MachinedSymbol, SwissWordmark } from '../BrandMarks';
import { Button } from '../ui/Button';
import { ResponsiveImage } from '../ui/ResponsiveImage';

interface ClosingStatementProps {
  config: BuildConfig;
  onOpenDesignSystem: () => void;
}

export const ClosingStatement: React.FC<ClosingStatementProps> = ({
  config,
  onOpenDesignSystem,
}) => {
  const buildCode = getBuildCode(config);

  return (
    <footer
      id="closing"
      className="kf-section kf-closing env-after-hours"
      aria-labelledby="closing-heading"
    >
      <div className="kf-container">
        <div className="kf-closing__layout">
          <div className="kf-closing__copy">
            <p className="kf-eyebrow">
              <span className="kf-eyebrow-index">07</span>
              <span className="kf-datum-tick" aria-hidden="true" />
              <span>Closing</span>
            </p>
            <h2 id="closing-heading" className="kf-display" style={{ marginBottom: '24px' }}>
              Nothing accidental.
            </h2>
            <p className="kf-lead" style={{ marginBottom: '32px' }}>
              From the 1.2 mm perimeter chamfer to the recessed rear USB-C port, every detail of
              KF—01 is designed to earn its place.
            </p>

            <div className="kf-closing__actions">
              <Button href="#build-studio" variant="primary">
                Return to Build Studio
              </Button>
              <span className="kf-closing__build-code">
                <span>Active spec</span>
                <strong>{buildCode}</strong>
              </span>
            </div>
          </div>

          <div className="kf-closing__media">
            <figure className="kf-closing__figure">
              <ResponsiveImage
                shotId="A08"
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="kf-closing__img"
              />
              <figcaption className="kf-closing__caption">
                Reference finish — Forest anodized 6063 aluminium, centered recessed USB-C
              </figcaption>
            </figure>
          </div>
        </div>

        <div className="kf-footer-colophon">
          <div className="kf-footer-colophon__brand">
            <MachinedSymbol height={22} accentColor="#B49A70" />
            <SwissWordmark height={13} accentColor="#B49A70" />
          </div>

          <p className="kf-disclaimer">
            KEYFORM and KF—01 are fictional industrial design concepts created for design and
            engineering review. Displayed imagery is computer-rendered; no commercial availability,
            manufacturing, certification, or laboratory testing is implied.
          </p>

          <button
            type="button"
            className="kf-colophon-dev-link"
            onClick={onOpenDesignSystem}
          >
            Design System &amp; Brand Lab →
          </button>
        </div>
      </div>
    </footer>
  );
};
