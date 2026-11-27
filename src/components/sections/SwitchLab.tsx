import React, { useMemo, useState } from 'react';
import { KF003B_ASSETS } from '../../assets/kf003bManifest';
import { SWITCH_PROFILES, type SwitchProfile } from '../../data/kf01Data';
import { useReveal } from '../../motion/useReveal';
import { ViewportHost } from '../../runtime/ViewportHost';
import type { StaticFallbackDescriptor, SwitchLabViewportState, ViewportMode } from '../../runtime/types';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';

interface SwitchLabProps {
  selectedStudioSwitch: SwitchProfile['id'];
  onApplyToStudio: (id: SwitchProfile['id']) => void;
}

export const SwitchLab: React.FC<SwitchLabProps> = ({
  selectedStudioSwitch,
  onApplyToStudio,
}) => {
  const [activeId, setActiveId] = useState<SwitchProfile['id']>('linear-45');
  const [mode, setMode] = useState<ViewportMode>('static-fallback');
  const [isPressed, setIsPressed] = useState(false);
  const { ref, revealed } = useReveal<HTMLDivElement>();

  const activeSwitch =
    SWITCH_PROFILES.find((item) => item.id === activeId) ?? SWITCH_PROFILES[0];

  const viewportState = useMemo<SwitchLabViewportState>(
    () => ({
      switchProfile: activeSwitch.id,
      pressed: isPressed,
    }),
    [activeSwitch.id, isPressed],
  );

  const fallback = useMemo<StaticFallbackDescriptor>(
    () => ({
      shotId: activeSwitch.shotId,
      sizes: '(min-width: 1024px) 42vw, 100vw',
      alt: KF003B_ASSETS[activeSwitch.shotId].defaultAlt,
      match: 'matched',
      statusLabel: `${activeSwitch.name} · Static Macro (${activeSwitch.shotId})`,
      detailNote:
        'Matched After Hours dark-studio macro render; real-time stem press 3D attaches via ViewportHost.',
    }),
    [activeSwitch.name, activeSwitch.shotId],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      setIsPressed(true);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      setIsPressed(false);
    }
  };

  return (
    <section
      id="switch-lab"
      className="kf-section env-after-hours"
      aria-labelledby="switch-lab-heading"
    >
      <div className="kf-container">
        <header className="kf-section-head">
          <div className="kf-section-head__title">
            <p className="kf-eyebrow">
              <span className="kf-eyebrow-index">04</span>
              <span className="kf-datum-tick" aria-hidden="true" />
              <span>Switch Lab</span>
            </p>
            <h2 id="switch-lab-heading" className="kf-h1">
              The feeling within.
            </h2>
          </div>
          <div className="kf-section-head__summary">
            <p className="kf-lead">
              Three conceptual switch profiles—smooth linear, crisp tactile, and quiet dampened—defined
              as nominal design targets and not laboratory tested.
            </p>
          </div>
        </header>

        <div
          ref={ref}
          className={`kf-switch-lab kf-reveal ${revealed ? 'kf-reveal--visible' : ''}`}
        >
          {/* Dedicated KF-003B dark After Hours macro specimen switching across A06a / A06b / A06c */}
          <div className="kf-switch-lab__visual">
            <figure className="kf-switch-specimen">
              <div className="kf-switch-specimen__plate kf-switch-specimen__plate--seamless">
                <ViewportHost
                  station="switch-lab"
                  onModeChange={setMode}
                  state={viewportState}
                  fallback={fallback}
                  imgClassName="kf-switch-specimen__img"
                />
              </div>
              <figcaption className="kf-switch-specimen__caption">
                <span>
                  {activeSwitch.name} — {activeSwitch.stemColorName} stem
                </span>
                <span>{mode === 'interactive-3d' ? '3D switch preview · Drag to orbit' : 'Studio macro render'}</span>
              </figcaption>
            </figure>
          </div>

          <div className="kf-switch-lab__detail">
            <div className="kf-switch-lab__tabs">
              <SegmentedControl
                ariaLabel="Switch profile selector"
                value={activeId}
                onChange={setActiveId}
                options={SWITCH_PROFILES.map((sw) => ({
                  id: sw.id,
                  label: sw.name,
                }))}
              />
            </div>

            <div className="kf-switch-panel kf-switch-panel--dark" role="tabpanel" aria-live="polite">
              <div className="kf-switch-panel__top">
                <span className="kf-switch-panel__id">
                  <span className="kf-switch-panel__code">{activeSwitch.code}</span>
                  <span className="kf-switch-panel__archetype">{activeSwitch.archetype}</span>
                </span>
                <span className="kf-switch-panel__disclosure">
                  Conceptual target · Not lab tested
                </span>
              </div>

              <h3 className="kf-h1" style={{ marginBottom: '14px' }}>
                {activeSwitch.name}
              </h3>

              <p className="kf-lead" style={{ color: 'var(--kf-chalk)', marginBottom: '8px' }}>
                {activeSwitch.character}
              </p>

              <div className="kf-switch-specs">
                <div>
                  <span className="kf-switch-spec__label">Actuation target</span>
                  <span className="kf-switch-spec__val">{activeSwitch.nominalForce}</span>
                </div>
                <div>
                  <span className="kf-switch-spec__label">Pre-travel</span>
                  <span className="kf-switch-spec__val">{activeSwitch.nominalPretravel}</span>
                </div>
                <div>
                  <span className="kf-switch-spec__label">Total travel</span>
                  <span className="kf-switch-spec__val">{activeSwitch.nominalTotalTravel}</span>
                </div>
                <div>
                  <span className="kf-switch-spec__label">Stem</span>
                  <span
                    className="kf-switch-spec__val"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        background: activeSwitch.stemColorHex,
                        border: '1px solid rgba(242,241,235,0.35)',
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    />
                    {activeSwitch.stemColorName}
                  </span>
                </div>
              </div>

              <dl className="kf-switch-notes">
                <div>
                  <dt>Housing</dt>
                  <dd>{activeSwitch.housingDesc}</dd>
                </div>
                <div>
                  <dt>Best suited for</dt>
                  <dd>{activeSwitch.bestFor}</dd>
                </div>
              </dl>

              {/* Illustrative press timing cue — explicitly NOT measured force or acoustic data */}
              <div className="kf-press-tester kf-press-tester--dark">
                <div style={{ flex: '1 1 200px' }}>
                  <span
                    className="kf-label"
                    style={{ display: 'block', color: 'rgba(242, 241, 235, 0.88)' }}
                  >
                    Illustrative travel cue
                  </span>
                  <div className="kf-travel-track kf-travel-track--dark" aria-hidden="true">
                    <div
                      className={`kf-travel-fill kf-travel-fill--dark ${isPressed ? 'kf-travel-fill--pressed' : ''}`}
                      style={{
                        transitionDuration: isPressed
                          ? `${activeSwitch.pressDurationMs}ms`
                          : `${activeSwitch.returnDurationMs}ms`,
                      }}
                    />
                  </div>
                </div>
                <Button
                  variant="secondary"
                  compact
                  onPointerDown={() => setIsPressed(true)}
                  onPointerUp={() => setIsPressed(false)}
                  onPointerLeave={() => setIsPressed(false)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  aria-pressed={isPressed}
                >
                  {isPressed ? `${activeSwitch.nominalTotalTravel} bottom-out` : 'Hold to preview travel'}
                </Button>
              </div>

              <div className="kf-switch-panel__footer">
                <span className="kf-caption" style={{ color: 'var(--kf-ah-muted)' }}>
                  {selectedStudioSwitch === activeSwitch.id
                    ? 'Selected in Build Studio'
                    : 'Not yet applied in Build Studio'}
                </span>
                <Button
                  variant="primary"
                  onClick={() => {
                    onApplyToStudio(activeSwitch.id);
                    document.getElementById('build-studio')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Apply to Build Studio
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
