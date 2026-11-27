import React from 'react';
import { KF003B_ASSETS, buildSrcSet } from '../../assets/kf003bManifest';
import { HERO_DATUMS } from '../../data/kf01Data';
import { Button } from '../ui/Button';

export const HeroSection: React.FC = () => {
  const desktopHero = KF003B_ASSETS.OR13;
  const mobileHero = KF003B_ASSETS.OR14;

  return (
    <section id="hero" className="kf-hero env-after-hours" aria-labelledby="hero-heading">
      <div className="kf-container kf-hero__content">
        <div className="kf-hero__grid">
          <div className="kf-hero__title-col">
            <p className="kf-eyebrow">
              <span className="kf-eyebrow-index">KF—01</span>
              <span className="kf-datum-tick" aria-hidden="true" />
              <span>Industrial Design Concept</span>
            </p>
            <h1 id="hero-heading" className="kf-display kf-hero__title">
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
              <Button href="#engineering" variant="secondary">
                Explore details ↓
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="kf-hero__media">
        <picture className="kf-hero__picture">
          <source
            media="(min-width: 768px)"
            type="image/avif"
            srcSet={buildSrcSet(desktopHero, 'avif')}
            sizes="100vw"
          />
          <source
            media="(min-width: 768px)"
            type="image/webp"
            srcSet={buildSrcSet(desktopHero, 'webp')}
            sizes="100vw"
          />
          <source
            media="(max-width: 767px)"
            type="image/avif"
            srcSet={buildSrcSet(mobileHero, 'avif')}
            sizes="100vw"
          />
          <source
            media="(max-width: 767px)"
            type="image/webp"
            srcSet={buildSrcSet(mobileHero, 'webp')}
            sizes="100vw"
          />
          <img
            src={desktopHero.fallbackSrc}
            alt={desktopHero.defaultAlt}
            width={desktopHero.intrinsicWidth}
            height={desktopHero.intrinsicHeight}
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            className="kf-hero__img"
          />
        </picture>
        <div className="kf-hero__scrim" aria-hidden="true" />
      </div>

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
          <div className="kf-hero__meta">
            <span className="kf-hero__rail-finish">Forest · Charcoal PBT</span>
            <span className="kf-hero__disclosure">Fictional design concept</span>
          </div>
        </div>
      </div>
    </section>
  );
};
