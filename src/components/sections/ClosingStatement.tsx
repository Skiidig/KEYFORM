import React from 'react';
import { KF003B_ASSETS, buildSrcSet } from '../../assets/kf003bManifest';
import { getBuildCode, type BuildConfig } from '../../data/kf01Data';
import { MachinedSymbol, SwissWordmark } from '../BrandMarks';
import { Button } from '../ui/Button';

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
      <div className="kf-container kf-closing__content">
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
              From the diamond-knurled encoder to the 1.2 mm perimeter chamfer, every detail of
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
              <picture className="kf-closing__picture">
                <source
                  media="(min-width: 1024px)"
                  type="image/avif"
                  srcSet={buildSrcSet(KF003B_ASSETS.C02, 'avif')}
                  sizes="100vw"
                />
                <source
                  media="(min-width: 1024px)"
                  type="image/webp"
                  srcSet={buildSrcSet(KF003B_ASSETS.C02, 'webp')}
                  sizes="100vw"
                />
                <source
                  media="(max-width: 1023px)"
                  type="image/avif"
                  srcSet={buildSrcSet(KF003B_ASSETS.C02Mobile, 'avif')}
                  sizes="(min-width: 760px) 760px, 100vw"
                />
                <source
                  media="(max-width: 1023px)"
                  type="image/webp"
                  srcSet={buildSrcSet(KF003B_ASSETS.C02Mobile, 'webp')}
                  sizes="(min-width: 760px) 760px, 100vw"
                />
                <img
                  src={KF003B_ASSETS.C02Mobile.fallbackSrc}
                  alt="Close-up of the KF—01 diamond-knurled encoder, Charcoal keycaps and chamfered Forest aluminium enclosure."
                  sizes="100vw"
                  loading="lazy"
                  decoding="async"
                  className="kf-closing__img"
                />
              </picture>
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
