import React from 'react';
import { useReveal } from '../../motion/useReveal';
import { ResponsiveImage } from '../ui/ResponsiveImage';

export const EngineeringBento: React.FC = () => {
  const { ref, revealed } = useReveal<HTMLDivElement>();

  return (
    <section
      id="engineering"
      className="kf-section env-form-function"
      aria-labelledby="engineering-heading"
    >
      <div className="kf-container">
        <header className="kf-section-head">
          <div className="kf-section-head__title">
            <p className="kf-eyebrow">
              <span className="kf-eyebrow-index">02</span>
              <span className="kf-datum-tick" aria-hidden="true" />
              <span>Engineering</span>
            </p>
            <h2 id="engineering-heading" className="kf-h1">
              Precision, by design.
            </h2>
          </div>
          <div className="kf-section-head__summary">
            <p className="kf-body">
              Built around standard Cherry MX mounting dimensions and shaped in solid 6063
              aluminium, with every bevel, fastener, and seam intentionally placed.
            </p>
          </div>
        </header>

        <div
          ref={ref}
          className={`kf-bento kf-reveal ${revealed ? 'kf-reveal--visible' : ''}`}
        >
          {/* Cell 1: 6063 Aluminium Enclosure Concept (7 cols) — A04a */}
          <article className="kf-bento__cell kf-bento__enclosure">
            <div className="kf-bento__media kf-bento__media--tall">
              <ResponsiveImage
                shotId="A04a"
                sizes="(min-width: 1024px) 58vw, (min-width: 768px) 62vw, 100vw"
                style={{ objectPosition: '58% 50%' }}
              />
            </div>
            <div className="kf-bento__pad">
              <div className="kf-bento__kicker">
                <span className="kf-bento__kicker-main">
                  <span className="kf-bento__index">02.1</span>
                  <span>Enclosure</span>
                </span>
              </div>
              <h3 className="kf-h2">6063 CNC Aluminium</h3>
              <p className="kf-bento__desc">
                Two-piece billet enclosure (327 × 138 mm) secured from beneath with eight recessed
                Torx screws, finished with a 1.2 mm perimeter chamfer and divided key clusters.
              </p>
            </div>
          </article>

          {/* Cell 2: 6.5-degree typing angle (5 cols) — A04b */}
          <article className="kf-bento__cell kf-bento__angle">
            <div className="kf-bento__angle-top">
              <div className="kf-bento__media kf-bento__media--profile">
                <ResponsiveImage
                  shotId="A04b"
                  sizes="(min-width: 1024px) 42vw, (min-width: 768px) 38vw, 100vw"
                />
              </div>
              <div className="kf-schematic-box">
                <svg
                  viewBox="0 0 360 88"
                  fill="none"
                  role="img"
                  aria-label="Technical elevation diagram showing 6.5 degree typing incline, 18.5 mm front chin, and 34.2 mm rear height"
                >
                  <line x1="16" y1="64" x2="344" y2="64" stroke="rgba(242,241,235,.36)" strokeWidth="1.1" />
                  <path d="M32 61V41L324 14V61H32Z" fill="rgba(242,241,235,.08)" stroke="#F2F1EB" strokeWidth="1.25" />
                  <line x1="32" y1="41" x2="236" y2="41" stroke="#B49A70" strokeWidth="1.1" strokeDasharray="3 3" />
                  <path d="M186 41A154 154 0 0 0 184.5 27" stroke="#B49A70" strokeWidth="1.5" />
                  <text x="196" y="37" fill="#F2F1EB" fontSize="11" fontWeight="600" fontFamily="IBM Plex Mono,monospace">6.5° INCLINE</text>
                  <text x="18" y="80" fill="rgba(242,241,235,.72)" fontSize="9.5" fontFamily="IBM Plex Mono,monospace">FRONT 18.5 MM</text>
                  <text x="252" y="80" fill="rgba(242,241,235,.72)" fontSize="9.5" fontFamily="IBM Plex Mono,monospace">REAR 34.2 MM</text>
                </svg>
              </div>
            </div>
            <div className="kf-bento__pad">
              <div className="kf-bento__kicker">
                <span className="kf-bento__kicker-main">
                  <span className="kf-bento__index">02.2</span>
                  <span>Ergonomics</span>
                </span>
              </div>
              <div className="kf-bento__figure">6.5°</div>
              <h3 className="kf-h3">Typing Incline</h3>
              <p className="kf-bento__desc">
                A low 18.5 mm front edge rises smoothly to 34.2 mm at the rear on flush silicone
                feet, supporting natural wrist posture without a wrist rest.
              </p>
            </div>
          </article>

          {/* Cell 3: 75% ANSI Layout (4 cols) */}
          <article className="kf-bento__cell kf-bento__layout">
            <div className="kf-bento__pad">
              <div className="kf-bento__kicker">
                <span className="kf-bento__kicker-main">
                  <span className="kf-bento__index">02.3</span>
                  <span>75% ANSI</span>
                </span>
              </div>
              <div className="kf-bento__figure">81 + 1</div>
              <h3 className="kf-h3">Compact Layout &amp; Rotary Dial</h3>
              <p className="kf-bento__desc">
                Separated function groups, a dedicated navigation column, offset arrow keys, and a
                20 mm knurled push-button rotary dial with 30 tactile detents.
              </p>
              <svg
                viewBox="0 0 280 94"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ marginTop: '12px' }}
                role="img"
                aria-label="Exploded 75 percent ANSI layout diagram with uniform keycap row"
              >
                <rect x="1" y="1" width="278" height="92" stroke="#CED2C9" strokeWidth="1" />
                <rect x="8" y="8" width="14" height="11" fill="#1A1F1E" stroke="#181C19" />
                <rect x="30" y="8" width="58" height="11" fill="#E6E7E0" stroke="#636B63" />
                <rect x="94" y="8" width="58" height="11" fill="#E6E7E0" stroke="#636B63" />
                <rect x="158" y="8" width="58" height="11" fill="#E6E7E0" stroke="#636B63" />
                <circle cx="256" cy="13.5" r="7" fill="#294B3B" />
                <rect x="8" y="25" width="222" height="58" fill="#E6E7E0" stroke="#636B63" />
                <rect x="238" y="25" width="34" height="42" fill="#E6E7E0" stroke="#636B63" />
                <rect
                  x="218"
                  y="71"
                  width="54"
                  height="12"
                  fill="#294B3B"
                  fillOpacity="0.14"
                  stroke="#294B3B"
                />
              </svg>
            </div>
          </article>

          {/* Cell 4: 19.05 mm Key Pitch (4 cols) */}
          <article className="kf-bento__cell kf-bento__cell--surface kf-bento__pitch">
            <div className="kf-bento__pad">
              <div className="kf-bento__kicker">
                <span className="kf-bento__kicker-main">
                  <span className="kf-bento__index">02.4</span>
                  <span>Key Grid</span>
                </span>
                <span className="kf-bento__origin kf-bento__origin--std">MX standard</span>
              </div>
              <div className="kf-bento__figure">19.05 mm</div>
              <h3 className="kf-h3">Standard Key Spacing</h3>
              <p className="kf-bento__desc">
                True to industry MX geometry: 19.05 mm (0.75 in) key pitch, 14 × 14 mm switch
                cutouts, a 1.50 mm switch plate, 1.60 mm FR4 PCB, and 4.0 mm travel.
              </p>
              <div className="kf-bento__datum-line">
                14.00 × 14.00 mm cutout · 1.50 mm plate
              </div>
            </div>
          </article>

          {/* Cell 5: Gasket Suspension & Decoupled USB-C (4 cols, Dark contrast anchor) — A04c */}
          <article className="kf-bento__cell kf-bento__cell--dark kf-bento__gasket">
            <div className="kf-bento__media kf-bento__media--usbc">
              <ResponsiveImage
                shotId="A04c"
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 38vw, 100vw"
              />
            </div>
            <div className="kf-bento__pad">
              <div className="kf-bento__kicker">
                <span className="kf-bento__kicker-main">
                  <span className="kf-bento__index">02.5</span>
                  <span>Isolation &amp; Port</span>
                </span>
              </div>
              <div className="kf-bento__figure" style={{ color: '#F2F1EB' }}>
                12×
              </div>
              <h3 className="kf-h3" style={{ color: '#F2F1EB' }}>
                Gasket Mount &amp; Recessed USB-C
              </h3>
              <p className="kf-bento__desc">
                Twelve perimeter silicone gaskets cushion the switch plate with no rigid screw
                contact, paired with a rear USB-C daughterboard mounted directly to the lower case.
              </p>
            </div>
          </article>

          {/* Cell 6: Internal Brass Weight (12 cols editorial split) — A07b corner fastener detail crop */}
          <article className="kf-bento__cell kf-bento__weight">
            <div className="kf-bento__media kf-bento__media--weight">
              <ResponsiveImage
                shotId="A07b"
                sizes="(min-width: 1024px) 60vw, (min-width: 768px) 62vw, 100vw"
              />
            </div>
            <div className="kf-bento__pad">
              <div>
                <div className="kf-bento__kicker">
                  <span className="kf-bento__kicker-main">
                    <span className="kf-bento__index">02.6</span>
                    <span>Weight</span>
                  </span>
                </div>
                <h3 className="kf-h2 kf-bento__weight-title">
                  Internal Brushed Brass Weight
                </h3>
                <p className="kf-bento__desc">
                  Recessed flush inside the lower aluminium case beneath a 2.0 mm Poron liner, the
                  solid brass bar anchors KF—01 at a conceptual target weight of ~1,680 g.
                </p>
              </div>
              <div className="kf-bento__weight-metrics">
                <div>
                  <span className="kf-label">Target weight</span>
                  <span className="kf-value">~1,680 g</span>
                </div>
                <div>
                  <span className="kf-label">Mounting</span>
                  <span className="kf-value">4× M3 countersunk</span>
                </div>
              </div>
            </div>
          </article>
        </div>

        <p className="kf-bento__footnote">
          KF—01 enclosure dimensions, ergonomics, and mass figures are industrial design concepts;
          key spacing and switch cutouts follow standard Cherry MX geometry.
        </p>
      </div>
    </section>
  );
};
