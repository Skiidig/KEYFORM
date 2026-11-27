import React from 'react';
import { HERO_DATUMS } from '../../data/kf01Data';
import { Button } from '../ui/Button';
import { ArtDirectedHeroPicture } from '../ui/ResponsiveImage';

export const HeroSection: React.FC = () => {
  return (
    <section id="hero" className="kf-hero env-after-hours" aria-labelledby="hero-heading">
      {/* Unified full-bleed cinematic studio composition — immediate LCP availability */}
      <div className="kf-hero__cinema">
        <div className="kf-container kf-hero__content">
          <div className="kf-hero__header-grid">
            <div className="kf-hero__title-col">
              <p className="kf-eyebrow">
                <span className="kf-eyebrow-index">KF—01</span>
                <span className="kf-datum-tick" aria-hidden="true" />
                <span>Industrial Design Concept</span>
              </p>
              <h1 id="hero-heading" className="kf-display">
                Precision in every press.
              </h1>
            </div>

            <div className="kf-hero__aside-col">
              <p className="kf-hero__sub">
                CNC-machined 6063 aluminium, silicone gasket isolation, and a compact 75% layout
                designed for quiet daily use.
              </p>
              <div className="kf-hero__actions">
                <Button href="#build-studio" variant="primary">
                  Configure KF—01
                </Button>
                <a href="#engineering" className="kf-hero__ghost-link">
                  <span>Explore details</span>
                  <span aria-hidden="true">↓</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Single art-directed <picture>: A01 (16:9) on >=768px, H02 (16:10.6) on <768px */}
        <div className="kf-hero__media">
          <ArtDirectedHeroPicture
            desktopShotId="A01"
            mobileShotId="H02"
            breakpointPx={768}
            alt="KEYFORM KF—01 with a Forest aluminium enclosure, Charcoal keycaps and a knurled rotary dial."
            pictureClassName="kf-hero__picture"
            className="kf-hero__img"
          />
          <div className="kf-hero__vignette" aria-hidden="true" />
        </div>
      </div>

      {/* Quiet bottom specification rail anchoring the full-bleed studio shot */}
      <div className="kf-hero__rail">
        <div className="kf-container kf-hero__rail-inner">
          <dl className="kf-hero__datums" aria-label="KF—01 primary specifications">
            {HERO_DATUMS.map((spec) => (
              <div key={spec.key} className="kf-hero__datum">
                <dt>{spec.key}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
          <div className="kf-hero__rail-meta">
            <span className="kf-hero__rail-finish">Shown in Forest with Charcoal PBT</span>
            <span className="kf-hero__rail-disclosure">Fictional design concept</span>
          </div>
        </div>
      </div>
    </section>
  );
};
