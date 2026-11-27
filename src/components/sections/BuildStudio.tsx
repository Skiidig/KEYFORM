import React, { useMemo, useState } from 'react';
import {
  ACCENT_KEYS,
  CHARCOAL_PBT_BASELINE_HEX,
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
  ViewportMode,
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
  const [cameraResetCount, setCameraResetCount] = useState(0);
  const [mode, setMode] = useState<ViewportMode>('static-fallback');
  const interactive = mode === 'interactive-3d';
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
    config.plate === DEFAULT_BUILD_CONFIG.plate &&
    (!config.keyOverrides || Object.keys(config.keyOverrides).length === 0);

  const matchedEscHex =
    config.keycaps === 'charcoal-pbt'
      ? CHARCOAL_PBT_BASELINE_HEX
      : (selectedKeycaps.secondaryHex ?? selectedKeycaps.swatchHex);

  const resolvedAccentOptions = useMemo(
    () =>
      ACCENT_KEYS.map((option) =>
        option.id === 'matched' ? { ...option, swatchHex: matchedEscHex } : option,
      ),
    [matchedEscHex],
  );

  const handleSelectEnclosure = (enclosure: EnclosureFinishId) => {
    onChangeConfig({ ...config, enclosure });
    // Ensure the user immediately sees the matched KF-003B enclosure render
    if (!interactive && mode !== 'loading-runtime' && cameraId !== 'studio-three-quarter') {
      setCameraId('studio-three-quarter');
    }
    setCopyFeedback('');
  };

  const handleSelectCamera = (nextCamera: StudioCameraPresetId) => {
    if (nextCamera === cameraId && interactive) {
      setCameraResetCount((count) => count + 1);
      return;
    }
    setCameraId(nextCamera);
  };

  const handleReset = () => {
    onChangeConfig(DEFAULT_BUILD_CONFIG);
    setCameraId('studio-three-quarter');
    if (interactive) setCameraResetCount((count) => count + 1);
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
              <span className="kf-eyebrow-index">06</span>
              <span className="kf-datum-tick" aria-hidden="true" />
              <span>Build Studio</span>
            </p>
            <h2 id="build-studio-heading" className="kf-h1">
              Make it yours.
            </h2>
          </div>
          <div className="kf-section-head__summary">
            <p className="kf-body">
              Pair anodized aluminium finishes with PBT keycaps, switches, and internal plate
              materials to compose your KF—01.
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
                <div
                  className={`kf-viewport__canvas ${
                    cameraId === 'after-hours-front'
                      ? 'kf-viewport__canvas--dark'
                      : cameraId === 'exploded'
                        ? 'kf-viewport__canvas--paper'
                        : ''
                  }`.trim()}
                >
                  <ViewportHost
                    station="build-studio"
                    onModeChange={setMode}
                    resetTrigger={cameraResetCount}
                    state={viewportState}
                    fallback={preview}
                    imgClassName="kf-viewport__img"
                  />
                </div>

                {/* Selective glassmorphism floats over stage on >= 640px; docks cleanly below on mobile */}
                <div className="kf-viewport__hud" role="region" aria-label="Camera views">
                  <div className="kf-hud-angles" role="group" aria-label="View angle">
                    {STUDIO_CAMERA_VIEWS.map((view) => (
                      <button
                        key={view.id}
                        type="button"
                        className="kf-hud-btn"
                        aria-pressed={cameraId === view.id}
                        onClick={() => handleSelectCamera(view.id)}
                      >
                        {view.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Single consolidated, truthful static / live preview status */}
            <p className="kf-viewport__note" aria-live="polite">
              <span
                className={`kf-viewport__match-tag kf-viewport__match-tag--${interactive ? 'matched' : preview.match}`}
              >
                {interactive
                  ? `${selectedEnclosure.name} · Live 3D`
                  : preview.statusLabel}
              </span>{' '}
              {interactive
                ? cameraId === 'exploded' || cameraId === 'rear-usb'
                  ? 'All exterior and internal selections are live. Drag to orbit.'
                  : 'Exterior selections are live. Drag to orbit or open Exploded for switches and plate.'
                : preview.detailNote}
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
                      options={resolvedAccentOptions}
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
                        {selectedSwitch.nominalForce} target · {selectedSwitch.archetype} concept · Visible in Exploded 3D.
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

              {/* Restrained Secondary Specification Summary & Utilities */}
              <div className="kf-summary-box" aria-live="polite">
                <div className="kf-summary-box__head">
                  <span className="kf-summary-box__title">Specification</span>
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

                <div className="kf-studio-actions">
                  <Button variant="secondary" compact onClick={handleCopyBuild}>
                    Copy Build Summary
                  </Button>
                  <Button variant="ghost" compact onClick={handleReset} disabled={isDefault}>
                    Reset
                  </Button>
                </div>
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
