import React, { useMemo, useState } from 'react';
import { KF003B_ASSETS } from '../../assets/kf003bManifest';
import { ANATOMY_LAYERS } from '../../data/kf01Data';
import { ViewportHost } from '../../runtime/ViewportHost';
import type {
  AnatomyViewportState,
  AssemblyGroupId,
  StaticFallbackDescriptor,
  ViewportMode,
} from '../../runtime/types';
import { Button } from '../ui/Button';

const EXTERIOR_GROUPS: ReadonlySet<AssemblyGroupId> = new Set([
  'GRP_01_Keycaps',
  'GRP_02_TopEnclosure',
  'GRP_09_BottomChassis',
]);
const isInternalGroup = (group: AssemblyGroupId) => !EXTERIOR_GROUPS.has(group);

export const MechanicalAnatomy: React.FC = () => {
  const [exploded, setExploded] = useState(true);
  const [layerFocused, setLayerFocused] = useState(false);
  const [mode, setMode] = useState<ViewportMode>('static-fallback');
  const [activeIndex, setActiveIndex] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);

  const activeLayer = ANATOMY_LAYERS[activeIndex];
  const interactive = mode === 'interactive-3d';

  const viewportState = useMemo<AnatomyViewportState>(
    () => ({
      activeGroup: activeLayer.groupName,
      exploded,
      focusedGroup: layerFocused ? activeLayer.groupName : null,
    }),
    [activeLayer.groupName, exploded, layerFocused],
  );

  const fallback = useMemo<StaticFallbackDescriptor>(
    () => ({
      shotId: 'A05',
      sizes: '(min-width: 1024px) 58vw, 100vw',
      alt: KF003B_ASSETS.A05.defaultAlt,
      match: 'matched',
      statusLabel: `Layer ${activeLayer.index} / 09 · Static Exploded Stack`,
      detailNote: 'Static exploded stack.',
    }),
    [activeLayer.index],
  );

  const selectLayer = (idx: number) => {
    setActiveIndex(idx);
    if (interactive) {
      if (!exploded && isInternalGroup(ANATOMY_LAYERS[idx].groupName)) setExploded(true);
      setLayerFocused(true);
    }
  };

  const handlePrev = () => {
    selectLayer(activeIndex === 0 ? ANATOMY_LAYERS.length - 1 : activeIndex - 1);
  };

  const handleNext = () => {
    selectLayer(activeIndex === ANATOMY_LAYERS.length - 1 ? 0 : activeIndex + 1);
  };

  const handleAssemble = () => {
    setExploded(false);
    setLayerFocused(false);
  };

  const handleExplode = () => {
    setExploded(true);
  };

  const handleReset = () => {
    setLayerFocused(false);
    setResetTrigger((value) => value + 1);
  };

  const footnote = interactive
    ? layerFocused
      ? `Focused: ${activeLayer.index} ${activeLayer.title} · Drag to orbit or reset.`
      : 'Drag to orbit · Select a layer to focus it in 3D.'
    : 'Static exploded render. Open 3D in the stage to orbit, assemble, or focus a layer.';

  return (
    <section
      id="anatomy"
      className="kf-section kf-section--ruled env-form-function"
      aria-labelledby="anatomy-heading"
    >
      <div className="kf-container">
        <header className="kf-section-head">
          <div className="kf-section-head__title">
            <p className="kf-eyebrow">
              <span className="kf-eyebrow-index">03</span>
              <span className="kf-datum-tick" aria-hidden="true" />
              <span>Mechanical Anatomy</span>
            </p>
            <h2 id="anatomy-heading" className="kf-h1">
              Every layer. A purpose.
            </h2>
          </div>
          <div className="kf-section-head__summary">
            <p className="kf-body">
              Explore all nine internal layers of KF—01, from the sculpted Charcoal PBT keycaps
              down to the solid aluminium base and internal brass weight.
            </p>
          </div>
        </header>

        <div className="kf-anatomy">
          <div className="kf-anatomy__visual">
            <figure className="kf-anatomy__stage">
              <div className="kf-anatomy__viewport">
                <ViewportHost
                  station="mechanical-anatomy"
                  onModeChange={setMode}
                  state={viewportState}
                  fallback={fallback}
                  imgClassName="kf-anatomy__img"
                  resetTrigger={resetTrigger}
                />
              </div>

              <div className="kf-anatomy__dock">
                <div className="kf-anatomy__readout">
                  <span className="kf-anatomy__tick" aria-hidden="true" />
                  <span className="kf-code kf-anatomy__index">{activeLayer.index} / 09</span>
                  <span className="kf-anatomy__role">{activeLayer.shortRole}</span>
                  <span className="kf-anatomy__mode">{interactive ? 'Live 3D' : 'Static'}</span>
                </div>

                <div className="kf-anatomy__dock-actions">
                  <div className="kf-anatomy__pose" role="group" aria-label="Assembly view">
                    <button
                      type="button"
                      className="kf-anatomy__pose-btn"
                      aria-pressed={!exploded}
                      disabled={!interactive}
                      onClick={handleAssemble}
                    >
                      Assemble
                    </button>
                    <button
                      type="button"
                      className="kf-anatomy__pose-btn"
                      aria-pressed={exploded}
                      disabled={!interactive}
                      onClick={handleExplode}
                    >
                      Explode
                    </button>
                  </div>
                  <button
                    type="button"
                    className="kf-anatomy__reset"
                    disabled={!interactive}
                    onClick={handleReset}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M3.5 8a4.5 4.5 0 1 1 1.3 3.2M3.5 8V4.5M3.5 8H7"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </figure>
            <p className="kf-anatomy__note">{footnote}</p>
          </div>

          <div className="kf-anatomy__panel">
            <div className="kf-anatomy__selector">
              <label htmlFor="kf-anatomy-layer" className="kf-label">
                Assembly layer
              </label>
              <div className="kf-anatomy__select-wrap">
                <select
                  id="kf-anatomy-layer"
                  className="kf-anatomy__select"
                  value={activeIndex}
                  onChange={(event) => selectLayer(Number(event.target.value))}
                >
                  {ANATOMY_LAYERS.map((layer, idx) => (
                    <option key={layer.id} value={idx}>
                      {layer.index} — {layer.title}
                    </option>
                  ))}
                </select>
                <svg
                  className="kf-anatomy__chevron"
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </div>
            </div>

            <div className="kf-anatomy__head" aria-live="polite">
              <p className="kf-eyebrow kf-anatomy__head-meta">
                <span className="kf-eyebrow-index">{activeLayer.index} / 09</span>
                <span className="kf-datum-tick" aria-hidden="true" />
                <span>{activeLayer.shortRole}</span>
              </p>
              <h3 className="kf-h2 kf-anatomy__title">{activeLayer.title}</h3>
              <p className="kf-body kf-anatomy__purpose">{activeLayer.purpose}</p>
            </div>

            <section className="kf-anatomy__tech" aria-label="Layer specifications and fit">
              <h4 className="kf-anatomy__tech-heading">Layer specifications &amp; fit</h4>
              <dl className="kf-anatomy__tech-dl">
                <div>
                  <dt>Material</dt>
                  <dd>{activeLayer.material}</dd>
                </div>
                <div>
                  <dt>How it fits</dt>
                  <dd>{activeLayer.assemblyRelation}</dd>
                </div>
                <div>
                  <dt>Assembly group</dt>
                  <dd className="kf-code">{activeLayer.groupName}</dd>
                </div>
                <div>
                  <dt>Explode offset</dt>
                  <dd className="kf-code">{activeLayer.explodeOffset}</dd>
                </div>
                <div>
                  <dt>Reference parent</dt>
                  <dd className="kf-code">{activeLayer.parent}</dd>
                </div>
                <div>
                  <dt>Engineering note</dt>
                  <dd>{activeLayer.engineeringNote}</dd>
                </div>
              </dl>
            </section>

            <div className="kf-anatomy__nav">
              <Button variant="ghost" compact onClick={handlePrev}>
                ← Previous
              </Button>
              <span className="kf-code kf-anatomy__pager">{activeLayer.index} / 09</span>
              <Button variant="ghost" compact onClick={handleNext}>
                Next →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
