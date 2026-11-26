import React, { useMemo, useState } from 'react';
import {
  ACCENT_KEYS,
  DEFAULT_BUILD_CONFIG,
  ENCLOSURE_FINISHES,
  KEYCAP_SETS,
  PLATE_MATERIALS,
  STUDIO_CAMERA_VIEWS,
  SWITCH_PROFILES,
  getBuildCode,
  resolveBuildStudioPreview,
  type BuildConfig,
  type SwitchProfile,
} from '../../data/kf01Data';
import { useReveal } from '../../motion/useReveal';
import { ViewportHost } from '../../runtime/ViewportHost';
import type {
  BuildStudioViewportState,
  EnclosureFinishId,
  StudioCameraPresetId,
} from '../../runtime/types';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';
import { SwatchSelector } from '../ui/SwatchSelector';

interface BuildStudioProps {
  config: BuildConfig;
  onChangeConfig: (next: BuildConfig) => void;
}

type StudioCategory = 'exterior' | 'keycaps' | 'internals';

export const BuildStudio: React.FC<BuildStudioProps> = ({ config, onChangeConfig }) => {
  const [cameraId, setCameraId] = useState<StudioCameraPresetId>('studio-three-quarter');
  const [activeCategory, setActiveCategory] = useState<StudioCategory>('exterior');
  const [copyFeedback, setCopyFeedback] = useState<string>('');
  const { ref, revealed } = useReveal<HTMLDivElement>();

  const selectedEnclosure =
    ENCLOSURE_FINISHES.find((o) => o.id === config.enclosure) ?? ENCLOSURE_FINISHES[0];
  const selectedKeycaps =
    KEYCAP_SETS.find((o) => o.id === config.keycaps) ?? KEYCAP_SETS[0];
  const selectedAccent =
    ACCENT_KEYS.find((o) => o.id === config.accent) ?? ACCENT_KEYS[0];
  const selectedSwitch =
    SWITCH_PROFILES.find((o) => o.id === config.switchProfile) ?? SWITCH_PROFILES[0];
  const selectedPlate =
    PLATE_MATERIALS.find((o) => o.id === config.plate) ?? PLATE_MATERIALS[0];

  const preview = useMemo(
    () => resolveBuildStudioPreview(config, cameraId),
    [config, cameraId],
  );

  const viewportState = useMemo<BuildStudioViewportState>(
    () => ({
      config,
      cameraPreset: cameraId,
    }),
    [config, cameraId],
  );

  const buildCode = getBuildCode(config);
  const isDefault =
    config.enclosure === DEFAULT_BUILD_CONFIG.enclosure &&
    config.keycaps === DEFAULT_BUILD_CONFIG.keycaps &&
    config.accent === DEFAULT_BUILD_CONFIG.accent &&
    config.switchProfile === DEFAULT_BUILD_CONFIG.switchProfile &&
    config.plate === DEFAULT_BUILD_CONFIG.plate;

  const handleSelectEnclosure = (enclosure: EnclosureFinishId) => {
    onChangeConfig({ ...config, enclosure });
    // Ensure the user immediately sees the matched KF-003B enclosure render
    if (cameraId !== 'studio-three-quarter') {
      setCameraId('studio-three-quarter');
    }
    setCopyFeedback('');
  };

  const handleReset = () => {
    onChangeConfig(DEFAULT_BUILD_CONFIG);
    setCameraId('studio-three-quarter');
    setCopyFeedback('Reset to default Forest / Uniform Charcoal PBT build.');
  };

  const handleCopyBuild = async () => {
    const summaryText = [
      `KEYFORM KF—01 Build Configuration (Fictional Design Concept)`,
      `Build Code: ${buildCode}`,
      `Enclosure: ${selectedEnclosure.name} (6063 CNC Aluminium)`,
      `Keycaps: ${selectedKeycaps.name} · Esc: ${selectedAccent.name}`,
      `Switches: ${selectedSwitch.name} (${selectedSwitch.nominalForce})`,
      `Switch Plate: ${selectedPlate.name} (1.50 mm)`,
    ].join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summaryText);
        setCopyFeedback(`Copied ${buildCode} build summary.`);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = summaryText;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopyFeedback(`Copied ${buildCode} build summary.`);
      } catch {
        setCopyFeedback(`Build code ready: ${buildCode}`);
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <section
      id="build-studio"
      className="kf-section env-atelier"
      aria-labelledby="build-studio-heading"
    >
      <div className="kf-container">
        <header className="kf-section-head">
          <div className="kf-section-head__title">
            <p className="kf-eyebrow">
              <span className="kf-eyebrow-index">05</span>
              <span className="kf-datum-tick" aria-hidden="true" />
              <span>Build Studio</span>
            </p>
            <h2 id="build-studio-heading" className="kf-h1">
              Make it yours.
            </h2>
          </div>
          <div className="kf-section-head__summary">
            <p className="kf-body">
              Compare all four anodized aluminium finishes in studio light, then tailor keycaps,
              switches, and plate material to compose your KF—01 specification.
            </p>
          </div>
        </header>

        {/* Viewport-First Atelier Layout: 8 columns viewport, 4 columns poised grouped controls */}
        <div
          ref={ref}
          className={`kf-studio kf-reveal ${revealed ? 'kf-reveal--visible' : ''}`}
        >
          <div className="kf-studio__viewport-col">
            <div className="kf-viewport">
              <div style={{ position: 'relative' }}>
                <div className="kf-viewport__canvas">
                  <ViewportHost
                    station="build-studio"
                    state={viewportState}
                    fallback={preview}
                    imgClassName="kf-viewport__img"
                  />
                </div>

                {/* Selective glassmorphism floats over stage on >= 640px; docks cleanly below on mobile */}
                <div className="kf-viewport__hud" role="region" aria-label="Reference camera views">
                  <div className="kf-hud-angles" role="group" aria-label="View angle">
                    {STUDIO_CAMERA_VIEWS.map((view) => (
                      <button
                        key={view.id}
                        type="button"
                        className="kf-hud-btn"
                        aria-pressed={cameraId === view.id}
                        onClick={() => setCameraId(view.id)}
                      >
                        {view.label}
                      </button>
                    ))}
                  </div>
                  <span
                    className={`kf-hud-status kf-hud-status--${preview.match}`}
                    aria-live="polite"
                  >
                    {preview.statusLabel}
                  </span>
                </div>
              </div>

              {/* Live selected palette pairing strip */}
              <div className="kf-pairing-strip" aria-label="Selected finish pairing swatches">
                <div className="kf-pairing-strip__item">
                  <span
                    className="kf-pairing-strip__dot"
                    style={{ background: selectedEnclosure.swatchHex }}
                    aria-hidden="true"
                  />
                  <span className="kf-pairing-strip__text">{selectedEnclosure.name}</span>
                </div>
                <div className="kf-pairing-strip__item">
                  <span
                    className="kf-pairing-strip__dot"
                    style={{ background: selectedKeycaps.swatchHex }}
                    aria-hidden="true"
                  />
                  <span className="kf-pairing-strip__text">{selectedKeycaps.name}</span>
                </div>
                <div className="kf-pairing-strip__item">
                  <span
                    className="kf-pairing-strip__dot"
                    style={{ background: selectedAccent.swatchHex }}
                    aria-hidden="true"
                  />
                  <span className="kf-pairing-strip__text">{selectedAccent.name}</span>
                </div>
                <div className="kf-pairing-strip__item">
                  <span
                    className="kf-pairing-strip__dot"
                    style={{ background: selectedPlate.swatchHex }}
                    aria-hidden="true"
                  />
                  <span className="kf-pairing-strip__text">{selectedPlate.name}</span>
                </div>
              </div>
            </div>

            {/* Transparent static preview disclosure */}
            <p className="kf-viewport__note" aria-live="polite">
              <span
                className={`kf-viewport__match-tag kf-viewport__match-tag--${preview.match}`}
              >
                {preview.match === 'matched'
                  ? 'Studio preview'
                  : preview.match === 'partial'
                    ? 'Partial preview'
                    : 'Reference view'}
              </span>{' '}
              {preview.detailNote}
            </p>
          </div>

          {/* Right: Poised, Progressive-Disclosure Atelier Control Rail */}
          <div className="kf-studio__controls-col">
            <div className="kf-studio-panel">
              <div className="kf-studio-panel__tabs">
                <SegmentedControl<StudioCategory>
                  ariaLabel="Build Studio configuration category"
                  value={activeCategory}
                  onChange={setActiveCategory}
                  options={[
                    { id: 'exterior', label: 'Exterior' },
                    { id: 'keycaps', label: 'Keycaps' },
                    { id: 'internals', label: 'Internals' },
                  ]}
                />
              </div>

              <div className="kf-studio-panel__body" role="tabpanel">
                {activeCategory === 'exterior' && (
                  <>
                    <SwatchSelector
                      label="Enclosure finish"
                      options={ENCLOSURE_FINISHES}
                      value={config.enclosure}
                      onChange={handleSelectEnclosure}
                    />
                    <p className="kf-studio-hint">{selectedEnclosure.finishNote}</p>

                    <SwatchSelector
                      label="Escape key"
                      options={ACCENT_KEYS}
                      value={config.accent}
                      onChange={(id) => {
                        onChangeConfig({ ...config, accent: id });
                        setCopyFeedback('');
                      }}
                    />
                    <p className="kf-studio-hint">{selectedAccent.finishNote}</p>
                  </>
                )}

                {activeCategory === 'keycaps' && (
                  <>
                    <SwatchSelector
                      label="Keycap set (1.5 mm PBT)"
                      options={KEYCAP_SETS}
                      value={config.keycaps}
                      onChange={(id) => {
                        onChangeConfig({ ...config, keycaps: id });
                        setCopyFeedback('');
                      }}
                    />
                    <p className="kf-studio-hint">{selectedKeycaps.finishNote}</p>

                    <SwatchSelector
                      label="Escape key"
                      options={ACCENT_KEYS}
                      value={config.accent}
                      onChange={(id) => {
                        onChangeConfig({ ...config, accent: id });
                        setCopyFeedback('');
                      }}
                    />
                    <p className="kf-studio-hint">{selectedAccent.finishNote}</p>
                  </>
                )}

                {activeCategory === 'internals' && (
                  <>
                    <div className="kf-control-group">
                      <div className="kf-control-group__header">
                        <span className="kf-control-group__label">Switch profile</span>
                        <span className="kf-control-group__selected">{selectedSwitch.name}</span>
                      </div>
                      <SegmentedControl<SwitchProfile['id']>
                        ariaLabel="Build Studio switch profile"
                        value={config.switchProfile}
                        onChange={(id) => {
                          onChangeConfig({ ...config, switchProfile: id });
                          setCopyFeedback('');
                        }}
                        options={SWITCH_PROFILES.map((sw) => ({
                          id: sw.id,
                          label: sw.name.replace('KF—', ''),
                        }))}
                      />
                      <p className="kf-studio-hint">
                        {selectedSwitch.nominalForce} target · {selectedSwitch.archetype} concept
                      </p>
                    </div>

                    <SwatchSelector
                      label="Switch plate (1.50 mm)"
                      options={PLATE_MATERIALS}
                      value={config.plate}
                      onChange={(id) => {
                        onChangeConfig({ ...config, plate: id });
                        setCopyFeedback('');
                      }}
                    />
                    <p className="kf-studio-hint">{selectedPlate.finishNote}</p>
                  </>
                )}
              </div>

              {/* Concise Active Build Summary */}
              <div className="kf-summary-box" aria-live="polite">
                <div className="kf-summary-box__head">
                  <span className="kf-summary-box__title">Build summary</span>
                  <span className="kf-summary-box__code">{buildCode}</span>
                </div>

                <dl className="kf-summary-dl">
                  <dt>Enclosure</dt>
                  <dd>{selectedEnclosure.name}</dd>
                  <dt>Keycaps</dt>
                  <dd>
                    {selectedKeycaps.name} · {selectedAccent.name}
                  </dd>
                  <dt>Switches</dt>
                  <dd>{selectedSwitch.name}</dd>
                  <dt>Plate</dt>
                  <dd>{selectedPlate.name}</dd>
                </dl>
              </div>

              <div className="kf-studio-actions">
                <Button variant="primary" onClick={handleCopyBuild}>
                  Copy Build Summary
                </Button>
                <Button variant="secondary" onClick={handleReset} disabled={isDefault}>
                  Reset
                </Button>
              </div>

              {copyFeedback && (
                <p role="status" aria-live="polite" className="kf-studio-feedback">
                  {copyFeedback}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
