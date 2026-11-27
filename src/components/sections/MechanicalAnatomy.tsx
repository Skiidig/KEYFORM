import React, { useMemo, useState } from 'react';
import { KF003B_ASSETS } from '../../assets/kf003bManifest';
import { ANATOMY_LAYERS } from '../../data/kf01Data';
import { useReveal } from '../../motion/useReveal';
import { ViewportHost } from '../../runtime/ViewportHost';
import type { AnatomyViewportState, AssemblyGroupId, StaticFallbackDescriptor, ViewportMode } from '../../runtime/types';
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
  const [techExpanded, setTechExpanded] = useState(false);
  const { ref, revealed } = useReveal<HTMLDivElement>();

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

  const handleToggleFocus = () => {
    if (layerFocused) {
      setLayerFocused(false);
      return;
    }
    if (!exploded && isInternalGroup(activeLayer.groupName)) setExploded(true);
    setLayerFocused(true);
  };

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

        <div
          ref={ref}
          className={`kf-anatomy kf-reveal ${revealed ? 'kf-reveal--visible' : ''}`}
        >
          <div className="kf-anatomy__visual-col">
            <div className="kf-anatomy__stage">
              <ViewportHost
                station="mechanical-anatomy"
                onModeChange={setMode}
                state={viewportState}
                fallback={fallback}
                imgClassName="kf-anatomy__img"
              >
                {mode !== 'interactive-3d' && <div
                  className="kf-anatomy__stratum-indicator"
                  style={{ top: `${activeLayer.stratumY}%` }}
                  aria-hidden="true"
                >
                  <span className="kf-anatomy__stratum-badge">
                    <span className="kf-anatomy__stratum-index">{activeLayer.index} / 09</span>
                    <span>{activeLayer.shortRole}</span>
                  </span>
                </div>}
              </ViewportHost>
            </div>
            <div className="kf-anatomy__stage-bar">
              {interactive && (
                <div className="kf-anatomy__stage-controls">
                  <div className="kf-anatomy__pose-toggle" role="group" aria-label="Assembly view">
                    <button
                      type="button"
                      className="kf-anatomy__pose-btn"
                      aria-pressed={!exploded}
                      onClick={handleAssemble}
                    >
                      Assemble
                    </button>
                    <button
                      type="button"
                      className="kf-anatomy__pose-btn"
                      aria-pressed={exploded}
                      onClick={() => setExploded(true)}
                    >
                      Explode
                    </button>
                  </div>
                  <button
                    type="button"
                    className="kf-anatomy__focus-btn"
                    aria-pressed={layerFocused}
                    onClick={handleToggleFocus}
                  >
                    {layerFocused ? 'Restore full view' : 'Focus layer'}
                  </button>
                </div>
              )}
              <p className="kf-anatomy__footnote">
                {interactive
                  ? layerFocused
                    ? `Focused: ${activeLayer.index} ${activeLayer.title} · Drag to orbit.`
                    : 'Drag to orbit · Select a layer to focus it in 3D.'
                  : 'Exploded view render. Open 3D to orbit or focus layers.'}
              </p>
            </div>
          </div>

          <div className="kf-anatomy__list-col">
            <div className="kf-anatomy__active-card" aria-live="polite">
              <div className="kf-anatomy__card-meta">
                <span className="kf-label kf-anatomy__layer-count">
                  Layer <span className="kf-code">{activeLayer.index}</span> / 09
                </span>
                <span className="kf-label">{activeLayer.shortRole}</span>
              </div>

              <h3 className="kf-h2 kf-anatomy__title">{activeLayer.title}</h3>

              <p className="kf-body kf-anatomy__purpose">{activeLayer.purpose}</p>

              {/* Progressive disclosure for material, fit & CAD engineering metadata */}
              <div className="kf-anatomy__tech">
                <button
                  type="button"
                  className="kf-anatomy__tech-toggle"
                  aria-expanded={techExpanded}
                  aria-controls="kf-anatomy-tech-panel"
                  onClick={() => setTechExpanded((prev) => !prev)}
                >
                  <span>Layer specifications &amp; fit</span>
                  <span aria-hidden="true">{techExpanded ? '−' : '+'}</span>
                </button>
                {techExpanded && (
                  <dl id="kf-anatomy-tech-panel" className="kf-anatomy__tech-dl">
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
                )}
              </div>

              <div className="kf-anatomy__controls">
                <Button variant="secondary" compact onClick={handlePrev}>
                  ← Previous
                </Button>
                <span className="kf-code kf-anatomy__pager">
                  {activeLayer.index} / 09
                </span>
                <Button variant="secondary" compact onClick={handleNext}>
                  Next →
                </Button>
              </div>
            </div>

            <nav aria-label="Nine mechanical assembly layers">
              <ol className="kf-layer-list">
                {ANATOMY_LAYERS.map((layer, idx) => {
                  const isCurrent = idx === activeIndex;
                  return (
                    <li key={layer.id}>
                      <button
                        type="button"
                        className="kf-layer-btn"
                        aria-current={isCurrent ? 'true' : undefined}
                        onClick={() => selectLayer(idx)}
                      >
                        <span className="kf-layer-btn__num">{layer.index}</span>
                        <span className="kf-layer-btn__name">{layer.title}</span>
                        <span className="kf-layer-btn__role">{layer.shortRole}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
};
