import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KF003B_ASSETS } from '../../assets/kf003bManifest';
import { SWITCH_PROFILES, type SwitchProfile } from '../../data/kf01Data';
import { useReveal } from '../../motion/useReveal';
import { ViewportHost } from '../../runtime/ViewportHost';
import type {
  HeroSwitchActuationPhase,
  HeroSwitchPresentation,
  StaticFallbackDescriptor,
  SwitchLabViewportState,
  ViewportMode,
} from '../../runtime/types';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';
import type { SwitchCurveDomRefs, SwitchTravelController } from './SwitchLabInteractive';

const loadSwitchLabInteractive = () => import('./SwitchLabInteractive');
const SwitchLabInteractive = lazy(() =>
  loadSwitchLabInteractive().then((m) => ({ default: m.SwitchLabInteractive })),
);
const SwitchLabCurve = lazy(() =>
  loadSwitchLabInteractive().then((m) => ({ default: m.SwitchLabCurve })),
);

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
  const [presentation, setPresentation] = useState<HeroSwitchPresentation>('cutaway');
  const [isPressed, setIsPressed] = useState(false);
  const [controlsReady, setControlsReady] = useState(false);
  const { ref, revealed } = useReveal<HTMLDivElement>();
  const controllerRef = useRef<SwitchTravelController | null>(null);
  const curveDomRef = useRef<SwitchCurveDomRefs>({ line: null, dot: null, readout: null });

  const activeSwitch =
    SWITCH_PROFILES.find((item) => item.id === activeId) ?? SWITCH_PROFILES[0];
  const interactive = mode === 'interactive-3d';

  // Mount the lazy force-travel curve and actuation module once Switch Lab approaches view
  // (never during initial hero load so entry JS stays <= 90 kB and initial scripts stay 1).
  useEffect(() => {
    if (controlsReady) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setControlsReady(true);
          io.disconnect();
        }
      },
      { rootMargin: '280px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [controlsReady, ref]);

  const handleModeChange = useCallback((next: ViewportMode) => {
    setMode(next);
    if (next !== 'interactive-3d') {
      setIsPressed(false);
      controllerRef.current?.reset();
    } else {
      setControlsReady(true);
    }
  }, []);

  const onTravelSample = useCallback((mm: number, phase: HeroSwitchActuationPhase) => {
    controllerRef.current?.onSample(mm, phase);
  }, []);

  const ensureAssembled = useCallback(() => {
    setPresentation((cur) => (cur === 'assembled' ? cur : 'assembled'));
  }, []);

  const handleSelectSwitch = (nextId: SwitchProfile['id']) => {
    setControlsReady(true);
    setIsPressed(false);
    setActiveId(nextId);
  };

  const viewportState = useMemo<SwitchLabViewportState>(
    () => ({
      switchProfile: activeSwitch.id,
      pressed: isPressed,
      presentation,
      onTravelSample,
    }),
    [activeSwitch.id, isPressed, onTravelSample, presentation],
  );

  const fallback = useMemo<StaticFallbackDescriptor>(
    () => ({
      shotId: activeSwitch.shotId,
      sizes: '(min-width: 1024px) 42vw, 100vw',
      alt: KF003B_ASSETS[activeSwitch.shotId].defaultAlt,
      match: 'matched',
      statusLabel: `${activeSwitch.name} · Static Macro (${activeSwitch.shotId})`,
      detailNote: 'Studio macro render.',
    }),
    [activeSwitch.name, activeSwitch.shotId],
  );

  return (
    <section id="switch-lab" className="kf-section env-after-hours" aria-labelledby="switch-lab-heading">
      <div className="kf-container">
        <header className="kf-section-head">
          <div className="kf-section-head__title">
            <p className="kf-eyebrow">
              <span className="kf-eyebrow-index">04</span>
              <span className="kf-datum-tick" aria-hidden="true" />
              <span>Switch Lab</span>
            </p>
            <h2 id="switch-lab-heading" className="kf-h1">The feeling within.</h2>
          </div>
          <div className="kf-section-head__summary">
            <p className="kf-lead">
              Three conceptual switch profiles—smooth linear, crisp tactile, and quiet dampened—defined
              as nominal design targets.
            </p>
          </div>
        </header>

        <div className="kf-switch-lab__tabs">
          <SegmentedControl
            ariaLabel="Switch profile selector"
            value={activeId}
            onChange={handleSelectSwitch}
            options={SWITCH_PROFILES.map((sw) => ({ id: sw.id, label: sw.name }))}
          />
        </div>

        <div ref={ref} className={`kf-switch-lab kf-reveal ${revealed ? 'kf-reveal--visible' : ''}`}>
          <div className="kf-switch-lab__visual">
            <figure className="kf-switch-specimen">
              <div className="kf-switch-specimen__plate kf-switch-specimen__plate--seamless">
                <ViewportHost
                  station="switch-lab"
                  onModeChange={handleModeChange}
                  state={viewportState}
                  fallback={fallback}
                  imgClassName="kf-switch-specimen__img"
                />
              </div>

              <div className="kf-switch-dock">
                {interactive && (
                  <div className="kf-switch-specimen__bar">
                    <div className="kf-switch-pose" role="group" aria-label="Switch presentation">
                      <button
                        type="button"
                        className="kf-switch-pose__btn"
                        aria-pressed={presentation === 'cutaway'}
                        onClick={() => {
                          setIsPressed(false);
                          controllerRef.current?.reset();
                          setPresentation('cutaway');
                        }}
                      >
                        Cutaway
                      </button>
                      <button
                        type="button"
                        className="kf-switch-pose__btn"
                        aria-pressed={presentation === 'assembled'}
                        onClick={() => setPresentation('assembled')}
                      >
                        Assembled
                      </button>
                    </div>
                    <span className="kf-switch-specimen__hint">
                      {presentation === 'assembled' ? 'Hold below to actuate' : 'Drag to inspect internals'}
                    </span>
                  </div>
                )}

                {controlsReady ? (
                  <Suspense fallback={<div className="kf-switch-interactive-slot" aria-busy="true" />}>
                    <SwitchLabInteractive
                      activeSwitch={activeSwitch}
                      interactive={interactive}
                      isPressed={isPressed}
                      onPressChange={setIsPressed}
                      onEnsureAssembled={ensureAssembled}
                      controllerRef={controllerRef}
                      curveDomRef={curveDomRef}
                    />
                  </Suspense>
                ) : (
                  <div className="kf-switch-interactive-slot">
                    <Button variant="secondary" compact onClick={() => setControlsReady(true)}>
                      Open switch actuation &amp; sound preview
                    </Button>
                  </div>
                )}
              </div>

              <figcaption className="kf-switch-specimen__caption">
                <span>{activeSwitch.name} — {activeSwitch.stemColorName} stem</span>
                <span>{interactive ? 'Live 3D · Drag to orbit' : 'Studio macro render'}</span>
              </figcaption>
            </figure>
          </div>

          <div className="kf-switch-lab__detail">
            <div className="kf-switch-panel kf-switch-panel--dark" role="tabpanel" aria-live="polite">
              <div className="kf-switch-panel__top">
                <span className="kf-switch-panel__id">
                  <span className="kf-switch-panel__archetype">{activeSwitch.archetype}</span>
                  <span className="kf-switch-panel__code">{activeSwitch.code}</span>
                </span>
              </div>

              <h3 className="kf-h1 kf-switch-panel__title">{activeSwitch.name}</h3>
              <p className="kf-lead kf-switch-panel__lead">{activeSwitch.character}</p>

              <p className="kf-switch-tactile-strip">
                <span>{activeSwitch.nominalForce}</span>
                <span aria-hidden="true">·</span>
                <span>{activeSwitch.nominalPretravel} pre-travel</span>
                <span aria-hidden="true">·</span>
                <span>{activeSwitch.nominalTotalTravel} travel</span>
              </p>

              <details className="kf-switch-details">
                <summary className="kf-switch-details__summary">
                  <span>Force curve &amp; technical details</span>
                </summary>
                <div className="kf-switch-details__body">
                  {controlsReady && (
                    <Suspense fallback={null}>
                      <SwitchLabCurve activeSwitch={activeSwitch} curveDomRef={curveDomRef} />
                    </Suspense>
                  )}
                </div>
              </details>

              <div className="kf-switch-panel__footer">
                <span className="kf-caption kf-switch-panel__status">
                  {selectedStudioSwitch === activeSwitch.id
                    ? 'Selected in Build Studio'
                    : 'Preview only until applied'}
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
