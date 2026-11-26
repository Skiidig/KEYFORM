import React, { useState } from 'react';
import { ENCLOSURE_FINISHES } from '../data/kf01Data';
import { KFMonogram, MachinedSymbol, SwissWordmark } from '../components/BrandMarks';
import { Accordion } from '../components/ui/Accordion';
import { Button } from '../components/ui/Button';
import { FallbackFrame } from '../components/ui/FallbackFrame';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { SpecBlock } from '../components/ui/SpecBlock';
import { SwatchSelector } from '../components/ui/SwatchSelector';

interface DesignSystemPreviewProps {
  onBackToPrototype: () => void;
}

const COLOR_ENVIRONMENTS = [
  {
    env: 'After Hours (Dark Cinematic)',
    usage: 'Hero Product Reveal (01), Switch Lab (04), Closing Statement (07), Header Chrome',
    tokens: [
      { name: 'Obsidian', token: '--kf-obsidian', hex: '#101211', lightText: true, contrast: '16.6:1 Chalk' },
      { name: 'Graphite', token: '--kf-graphite', hex: '#1C201E', lightText: true, contrast: '14.6:1 Chalk' },
      { name: 'Carbon', token: '--kf-carbon', hex: '#2A302C', lightText: true, contrast: '11.9:1 Chalk' },
      { name: 'Muted', token: '--kf-ah-muted', hex: '#A5ACA5', lightText: false, contrast: '8.1:1 on Obsidian' },
      { name: 'Chalk', token: '--kf-chalk', hex: '#F2F1EB', lightText: false, contrast: '16.6:1 on Obsidian' },
    ],
  },
  {
    env: 'Form / Function (Swiss Editorial)',
    usage: 'Engineering Bento (02), Mechanical Anatomy (03), Material Library (06)',
    tokens: [
      { name: 'Paper', token: '--kf-paper', hex: '#F2F1EB', lightText: false, contrast: '15.2:1 Ink' },
      { name: 'Surface', token: '--kf-surface', hex: '#E6E7E0', lightText: false, contrast: '13.8:1 Ink' },
      { name: 'Border', token: '--kf-border', hex: '#CED2C9', lightText: false, contrast: 'Hairline Rule' },
      { name: 'Muted', token: '--kf-ff-muted', hex: '#636B63', lightText: true, contrast: '4.87:1 on Paper' },
      { name: 'Ink', token: '--kf-ink', hex: '#181C19', lightText: true, contrast: '15.2:1 on Paper' },
    ],
  },
  {
    env: 'The Atelier (Tactile Customization)',
    usage: 'Interactive Build Studio (05), Swatches & Controls',
    tokens: [
      { name: 'Limestone', token: '--kf-limestone', hex: '#E9E5DB', lightText: false, contrast: '11.9:1 Charcoal' },
      { name: 'Porcelain', token: '--kf-porcelain', hex: '#F8F6F0', lightText: false, contrast: '13.8:1 Charcoal' },
      { name: 'Forest (Primary Accent)', token: '--kf-forest', hex: '#294B3B', lightText: true, contrast: '8.98:1 Porcelain' },
      { name: 'Brass (Sparing Detail)', token: '--kf-brass', hex: '#B49A70', lightText: false, contrast: '6.98:1 Obsidian' },
      { name: 'Charcoal PBT', token: '--kf-charcoal', hex: '#1A1F1E', lightText: true, contrast: '15.6:1 Porcelain' },
    ],
  },
];

const SPACING_SCALE = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 144];

const ACCORDION_SAMPLE = [
  {
    id: 'acc-1',
    index: '01',
    title: 'Contrast discipline on elevated light surfaces',
    content:
      'Form / Function Muted (#636B63) achieves 4.87:1 on Paper (#F2F1EB) and 5.10:1 on Porcelain (#F8F6F0), passing WCAG AA. On slightly darker Surface (#E6E7E0) and Limestone (#E9E5DB), this system automatically uses --kf-ff-muted-elevated (#505751, 5.75:1–5.91:1) so every label remains AA-compliant.',
  },
  {
    id: 'acc-2',
    index: '02',
    title: 'Selective glassmorphism boundary',
    content:
      'Frosted translucency (backdrop-filter: blur(12px)) is restricted strictly to floating viewport HUD controls overlaid on photography or future 3D canvases. Static editorial blocks, bento tiles, and specification panels remain crisp solid surfaces.',
  },
  {
    id: 'acc-3',
    index: '03',
    title: 'Reduced-motion & precision timing',
    content:
      'Instant (80 ms), Fast (150 ms), Standard (240 ms), Panel (360 ms), Camera (800 ms reserved), and Cinematic (1200 ms max) pair with precision cubic-bezier(.2,.75,.25,1), mechanical cubic-bezier(.4,0,.2,1), cinematic cubic-bezier(.65,0,.25,1), and linear curves. Under prefers-reduced-motion: reduce, durations collapse to 0.01ms.',
  },
];

export const DesignSystemPreview: React.FC<DesignSystemPreviewProps> = ({
  onBackToPrototype,
}) => {
  const [sampleTab, setSampleTab] = useState<'overview' | 'tokens' | 'states'>('overview');
  const [sampleSwatch, setSampleSwatch] = useState<string>('forest');
  const [mediaState, setMediaState] = useState<'loaded' | 'loading' | 'fallback'>('loaded');

  return (
    <div>
      {/* Top Banner */}
      <section className="kf-section kf-section--tight env-after-hours">
        <div className="kf-container">
          <div className="kf-section-head" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
            <div className="kf-section-head__title">
              <p className="kf-eyebrow">
                <span className="kf-eyebrow-index">DS—V1</span>
                <span className="kf-datum-tick" aria-hidden="true" />
                <span>KF-004A · Production System & Brand Reference</span>
              </p>
              <h1 className="kf-h1">Design System & Brand Lab</h1>
            </div>
            <div className="kf-section-head__summary">
              <p className="kf-lead" style={{ marginBottom: '20px' }}>
                Live inspection board for Phase 1 brand mark exploration and Phase 2 reusable
                Design System V1 tokens, typography, grid rhythm, and accessible UI states.
              </p>
              <Button variant="primary" onClick={onBackToPrototype}>
                ← Return to 7-Section Prototype
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 1: Brand Exploration (3 Original Vector Directions) */}
      <section className="kf-section env-form-function" aria-labelledby="brand-lab-heading">
        <div className="kf-container">
          <header className="kf-section-head">
            <div className="kf-section-head__title">
              <p className="kf-eyebrow">
                <span className="kf-eyebrow-index">P1</span>
                <span className="kf-datum-tick" aria-hidden="true" />
                <span>Brand Identity Exploration</span>
              </p>
              <h2 id="brand-lab-heading" className="kf-h1">
                Three original logo directions.
              </h2>
            </div>
            <div className="kf-section-head__summary">
              <p className="kf-body">
                Evaluated for optical legibility, 16px favicon clarity, CNC/laser engraving on
                6063 aluminium and brushed brass, and editorial authority. Recommended pairing:
                Direction 01 (Primary Wordmark) + Direction 03 (Supporting Symbol).
              </p>
            </div>
          </header>

          <div className="kf-ds-grid kf-ds-grid--3" style={{ marginBottom: '48px' }}>
            {/* Direction 01 */}
            <article className="kf-logo-specimen">
              <div className="kf-logo-specimen__stage kf-logo-specimen__stage--dark">
                <SwissWordmark height={22} accentColor="#B49A70" />
              </div>
              <div className="kf-logo-specimen__stage kf-logo-specimen__stage--light" style={{ minHeight: '96px' }}>
                <SwissWordmark height={20} accentColor="#294B3B" />
              </div>
              <div className="kf-bento__pad">
                <span className="kf-spec-tag kf-spec-tag--concept">Recommended Primary Wordmark</span>
                <h3 className="kf-h3">01 · Swiss Typographic Wordmark</h3>
                <p className="kf-bento__desc">
                  Custom vector letterforms on a strict baseline grid with a machined squircle O
                  and a single registration datum bar. Zero font-rendering drift across platforms.
                </p>
              </div>
            </article>

            {/* Direction 02 */}
            <article className="kf-logo-specimen">
              <div className="kf-logo-specimen__stage kf-logo-specimen__stage--dark">
                <KFMonogram height={64} />
              </div>
              <div className="kf-logo-specimen__stage kf-logo-specimen__stage--engraved" style={{ minHeight: '96px' }}>
                <KFMonogram height={44} />
              </div>
              <div className="kf-bento__pad">
                <span className="kf-spec-tag">Retained Alternative</span>
                <h3 className="kf-h3">02 · Geometric KF Monogram</h3>
                <p className="kf-bento__desc">
                  Chamfered monolith perimeter referencing the 1.2 mm 45° bezel, enclosing
                  interlocking geometric K and F strokes. Strong stamp identity for packaging or
                  novelty keycaps.
                </p>
              </div>
            </article>

            {/* Direction 03 */}
            <article className="kf-logo-specimen">
              <div className="kf-logo-specimen__stage kf-logo-specimen__stage--dark">
                <MachinedSymbol height={64} accentColor="#B49A70" />
              </div>
              <div className="kf-logo-specimen__stage kf-logo-specimen__stage--engraved" style={{ minHeight: '96px' }}>
                <MachinedSymbol height={44} accentColor="#5D4A2D" />
              </div>
              <div className="kf-bento__pad">
                <span className="kf-spec-tag kf-spec-tag--concept">Recommended Brand Symbol</span>
                <h3 className="kf-h3">03 · Machined Key Datum Symbol</h3>
                <p className="kf-bento__desc">
                  Distills the 14.0 mm plate cutout, sculpted Cherry keycap crown dish, and MX
                  cross-stem registration datum into one unmistakable hardware emblem.
                </p>
              </div>
            </article>
          </div>

          {/* Favicon & Micro-Scale Verification Strip */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px',
              padding: '24px',
              background: 'var(--kf-surface)',
              border: '1px solid var(--env-border)',
              marginBottom: '32px',
            }}
          >
            <div>
              <span className="kf-micro" style={{ display: 'block', marginBottom: '4px' }}>
                Scale & Favicon Check (16px / 24px / 32px / 48px)
              </span>
              <p className="kf-body" style={{ fontSize: '0.875rem' }}>
                Direction 03 maintains clear silhouette and cross-stem recognition down to 16×16 px
                browser tabs without stroke collapse.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {[16, 24, 32, 48].map((sz) => (
                <div key={sz} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      width: sz + 8,
                      height: sz + 8,
                      background: '#101211',
                      color: '#F2F1EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                    }}
                  >
                    <MachinedSymbol height={sz} accentColor="#B49A70" />
                  </div>
                  <span className="kf-mono" style={{ fontSize: '0.7rem' }}>
                    {sz}px
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Evaluation Matrix Table */}
          <div className="kf-table-wrap">
            <table className="kf-table">
              <thead>
                <tr>
                  <th>Direction</th>
                  <th>Readability</th>
                  <th>16px Favicon</th>
                  <th>CNC / Laser Engraving</th>
                  <th>Distinctiveness</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>01 · Swiss Wordmark</strong>
                  </td>
                  <td>High (wide optical kerning)</td>
                  <td>Not suited (horizontal aspect)</td>
                  <td>Excellent along chassis rear or weight</td>
                  <td>Braun / Leica editorial restraint</td>
                  <td>
                    <strong>Primary Wordmark</strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>02 · KF Monogram</strong>
                  </td>
                  <td>Medium-High at ≥ 24px</td>
                  <td>Tight interior counter at 16px</td>
                  <td>Good on 12 mm+ badges</td>
                  <td>Strong monogram stamp</td>
                  <td>Keep as packaging/badge alternate</td>
                </tr>
                <tr>
                  <td>
                    <strong>03 · Machined Symbol</strong>
                  </td>
                  <td>Instant geometric recognition</td>
                  <td>Excellent (clean 4-element geometry)</td>
                  <td>Ideal for single-pass CNC or laser etch</td>
                  <td>Uniquely mechanical keyboard native</td>
                  <td>
                    <strong>Supporting Symbol & Favicon</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Phase 2: Color Environments & Semantic Tokens */}
      <section className="kf-section env-atelier" aria-labelledby="ds-colors-heading">
        <div className="kf-container">
          <header className="kf-section-head">
            <div className="kf-section-head__title">
              <p className="kf-eyebrow">
                <span className="kf-eyebrow-index">P2.1</span>
                <span className="kf-datum-tick" aria-hidden="true" />
                <span>Semantic Color Environments</span>
              </p>
              <h2 id="ds-colors-heading" className="kf-h1">
                Three environments. One brand.
              </h2>
            </div>
            <div className="kf-section-head__summary">
              <p className="kf-body">
                Forest (#294B3B) serves as primary functional accent. Brass (#B49A70) is reserved
                sparingly for mechanical accents and dark-surface technical metadata.
              </p>
            </div>
          </header>

          <div style={{ display: 'grid', gap: '40px' }}>
            {COLOR_ENVIRONMENTS.map((group) => (
              <div key={group.env}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <h3 className="kf-h3">{group.env}</h3>
                  <span className="kf-mono" style={{ fontSize: '0.75rem', color: 'var(--env-muted)' }}>
                    {group.usage}
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {group.tokens.map((t) => (
                    <div key={t.token} className="kf-token-card">
                      <div
                        className="kf-token-card__swatch"
                        style={{
                          background: t.hex,
                          color: t.lightText ? '#F2F1EB' : '#181C19',
                        }}
                      >
                        <span>{t.hex}</span>
                        <span>{t.contrast}</span>
                      </div>
                      <div className="kf-token-card__info">
                        <strong style={{ fontSize: '0.875rem' }}>{t.name}</strong>
                        <span className="kf-mono" style={{ fontSize: '0.72rem', color: 'var(--env-muted)' }}>
                          {t.token}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Phase 2: Typography, Spacing & Interactive Components */}
      <section className="kf-section env-form-function" aria-labelledby="ds-components-heading">
        <div className="kf-container">
          <header className="kf-section-head">
            <div className="kf-section-head__title">
              <p className="kf-eyebrow">
                <span className="kf-eyebrow-index">P2.2</span>
                <span className="kf-datum-tick" aria-hidden="true" />
                <span>Typography, Spacing & Components</span>
              </p>
              <h2 id="ds-components-heading" className="kf-h1">
                Reusable system primitives.
              </h2>
            </div>
            <div className="kf-section-head__summary">
              <p className="kf-body">
                Self-hosted Manrope Variable paired with IBM Plex Mono (tabular numerals), a
                4–144 px spacing ladder, 0–6 px radii, and 44 px minimum interactive targets.
              </p>
            </div>
          </header>

          {/* Typography Specimens */}
          <div
            style={{
              padding: '32px',
              background: 'var(--kf-porcelain)',
              border: '1px solid var(--env-border)',
              marginBottom: '40px',
              display: 'grid',
              gap: '24px',
            }}
          >
            <div>
              <span className="kf-micro" style={{ color: 'var(--env-muted)' }}>
                Display · Manrope 500 · clamp(2.75rem, 6.2vw, 5.75rem) · −0.032em
              </span>
              <p className="kf-display" style={{ marginTop: '6px' }}>
                Precision in every press.
              </p>
            </div>
            <div style={{ borderTop: '1px solid var(--env-border)', paddingTop: '20px' }}>
              <span className="kf-micro" style={{ color: 'var(--env-muted)' }}>
                Section H1 · Manrope 500 · clamp(2.125rem, 4.2vw, 3.75rem) · −0.022em
              </span>
              <p className="kf-h1" style={{ marginTop: '6px' }}>
                Every layer. A purpose.
              </p>
            </div>
            <div style={{ borderTop: '1px solid var(--env-border)', paddingTop: '20px' }}>
              <span className="kf-micro" style={{ color: 'var(--env-muted)' }}>
                Technical Mono · IBM Plex Mono · tabular-nums
              </span>
              <p className="kf-mono" style={{ marginTop: '6px', fontSize: '1rem' }}>
                KF—01 · 327.0 × 138.0 MM · 6.5° · 19.05 MM PITCH · 14.00 × 14.00 MM CUTOUT
              </p>
            </div>
          </div>

          {/* Spacing Scale */}
          <div style={{ marginBottom: '48px' }}>
            <h3 className="kf-h3" style={{ marginBottom: '16px' }}>
              Spacing Scale (4 px – 144 px)
            </h3>
            <div
              style={{
                display: 'grid',
                gap: '8px',
                padding: '20px',
                background: 'var(--kf-surface)',
                border: '1px solid var(--env-border)',
              }}
            >
              {SPACING_SCALE.map((px) => (
                <div
                  key={px}
                  style={{ display: 'grid', gridTemplateColumns: '64px 1fr', alignItems: 'center', gap: '12px' }}
                >
                  <span className="kf-mono" style={{ fontSize: '0.75rem' }}>
                    {px}px
                  </span>
                  <div
                    style={{
                      width: `${Math.min(px * 2.5, 360)}px`,
                      maxWidth: '100%',
                      height: '10px',
                      background: 'var(--kf-forest)',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Component Board */}
          <div className="kf-ds-grid kf-ds-grid--2">
            {/* Buttons & Controls */}
            <div className="kf-switch-panel">
              <span className="kf-micro" style={{ display: 'block', marginBottom: '16px', color: 'var(--env-muted)' }}>
                Buttons, Links & Segmented Controls (≥ 44px Targets)
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                <Button variant="primary">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="ghost">Ghost Action</Button>
                <Button variant="primary" disabled>
                  Disabled
                </Button>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <a href="#build-studio" className="kf-text-link" onClick={(e) => { e.preventDefault(); onBackToPrototype(); }}>
                  <span>Editorial text link</span>
                  <span aria-hidden="true">→</span>
                </a>
              </div>
              <SegmentedControl
                ariaLabel="Design system demo tabs"
                value={sampleTab}
                onChange={setSampleTab}
                options={[
                  { id: 'overview', label: 'Overview' },
                  { id: 'tokens', label: 'Tokens' },
                  { id: 'states', label: 'States' },
                ]}
              />
              <p className="kf-mono" style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--env-muted)' }}>
                Active segmented tab: <strong>{sampleTab}</strong> (Tab with keyboard to verify 2px focus ring)
              </p>
            </div>

            {/* Swatches & Spec Blocks */}
            <div className="kf-switch-panel">
              <SwatchSelector
                label="Material Swatch Component"
                options={ENCLOSURE_FINISHES}
                value={sampleSwatch}
                onChange={setSampleSwatch}
              />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '16px',
                  marginTop: '24px',
                }}
              >
                <SpecBlock
                  label="Key Pitch"
                  value="19.05 mm"
                  note="Center-to-center 1u datum"
                  classification="standard"
                />
                <SpecBlock
                  label="Typing Angle"
                  value="6.5°"
                  note="Desk-plane chassis rise"
                  classification="concept"
                />
              </div>
            </div>

            {/* Accordion */}
            <div className="kf-switch-panel">
              <span className="kf-micro" style={{ display: 'block', marginBottom: '12px', color: 'var(--env-muted)' }}>
                Accessible Accordion Controls
              </span>
              <Accordion items={ACCORDION_SAMPLE} defaultOpenId="acc-1" />
            </div>

            {/* Loading & Fallback States */}
            <div className="kf-switch-panel">
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <span className="kf-micro" style={{ color: 'var(--env-muted)' }}>
                  Media Loading & Fallback States
                </span>
                <SegmentedControl
                  ariaLabel="Preview media frame state"
                  value={mediaState}
                  onChange={setMediaState}
                  options={[
                    { id: 'loaded', label: 'Loaded' },
                    { id: 'loading', label: 'Loading' },
                    { id: 'fallback', label: 'Fallback' },
                  ]}
                />
              </div>
              <FallbackFrame
                shotId="A03"
                alt="KF—01 Forest aluminium and uniform Charcoal PBT studio render inside FallbackFrame component"
                captionLeft="FallbackFrame Component (A03)"
                captionRight={`State: ${mediaState}`}
                simulateLoading={mediaState === 'loading'}
                simulateError={mediaState === 'fallback'}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
