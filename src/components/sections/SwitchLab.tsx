import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KF003B_ASSETS } from '../../assets/kf003bManifest';
import { SWITCH_PROFILES, type SwitchProfile } from '../../data/kf01Data';
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
  const ref = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<SwitchTravelController | null>(null);
  const curveDomRef = useRef<SwitchCurveDomRefs>({ line: null, dot: null, readout: null });

  const activeSwitch =
    SWITCH_PROFILES.find((item) => item.id === activeId) ?? SWITCH_PROFILES[0];
  const interactive = mode === 'interactive-3d';

  // Start loading the interaction module as the section approaches the viewport.
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
      sizes: '(min-width: 1024px) 58vw, 100vw',
      alt: KF003B_ASSETS[activeSwitch.shotId].defaultAlt,
      match: 'matched',
      statusLabel: `${activeSwitch.name} · Static Macro (${activeSwitch.shotId})`,
      detailNote: 'Studio macro render.',
    }),
    [activeSwitch.name, activeSwitch.shotId],
  );

  return (
    <section
      id="switch-lab"
      className="kf-section env-after-hours kf-switch-lab-section"
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
              Three conceptual switch profiles—smooth linear, crisp tactile, and quiet
              dampened—defined as nominal design targets.
            </p>
          </div>
        </header>

        <div className="kf-switch-lab__profiles">
          <SegmentedControl
            ariaLabel="Switch profile selector"
            value={activeId}
            onChange={handleSelectSwitch}
            options={SWITCH_PROFILES.map((sw) => ({ id: sw.id, label: sw.name }))}
          />
        </div>

        <div ref={ref} className="kf-switch-lab">
          <div className="kf-switch-lab__visual">
            <figure className="kf-switch-lab__specimen">
              <div className="kf-switch-lab__stage">
                <ViewportHost
                  station="switch-lab"
                  onModeChange={handleModeChange}
                  state={viewportState}
                  fallback={fallback}
                  imgClassName="kf-switch-lab__img"
                />
              </div>

              <div className="kf-switch-lab__dock">
                <div className="kf-switch-lab__dock-head">
                  <div className="kf-switch-lab__readout">
                    <span className="kf-switch-lab__tick" aria-hidden="true" />
                    <span className="kf-code kf-switch-lab__code">{activeSwitch.code}</span>
                    <span className="kf-switch-lab__archetype">{activeSwitch.archetype}</span>
                  </div>

                  {interactive ? (
                    <div className="kf-switch-lab__pose-row">
                      <div className="kf-switch-lab__pose" role="group" aria-label="Switch presentation">
                        <button
                          type="button"
                          className="kf-switch-lab__pose-btn"
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
                          className="kf-switch-lab__pose-btn"
                          aria-pressed={presentation === 'assembled'}
                          onClick={() => setPresentation('assembled')}
                        >
                          Assembled
                        </button>
                      </div>
                      <span className="kf-switch-lab__hint">
                        {presentation === 'assembled' ? 'Hold to actuate' : 'Drag to inspect'}
                      </span>
                    </div>
                  ) : (
                    <span className="kf-switch-lab__hint">Studio macro render</span>
                  )}
                </div>

                {controlsReady ? (
                  <Suspense
                    fallback={
                      <div
                        className="kf-switch-lab__slot"
                        aria-busy="true"
                        aria-label="Loading interaction controls"
                      />
                    }
                  >
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
                  <div className="kf-switch-lab__slot">
                    <Button variant="secondary" compact onClick={() => setControlsReady(true)}>
                      Open switch actuation &amp; sound preview
                    </Button>
                  </div>
                )}
              </div>
            </figure>
          </div>

          <div className="kf-switch-lab__detail">
            <div
              id="kf-switch-panel"
              className="kf-switch-lab__panel"
              role="tabpanel"
              aria-live="polite"
            >
              <div className="kf-switch-lab__panel-top">
                <span className="kf-switch-lab__panel-archetype">{activeSwitch.archetype}</span>
                <span className="kf-code kf-switch-lab__panel-code">{activeSwitch.code}</span>
              </div>

              <h3 className="kf-h1 kf-switch-lab__title">{activeSwitch.name}</h3>
              <p className="kf-lead kf-switch-lab__lead">{activeSwitch.character}</p>

              <dl className="kf-switch-lab__specs" aria-label="Switch specifications">
                <div>
                  <dt>Actuation force</dt>
                  <dd>{activeSwitch.nominalForce}</dd>
                </div>
                <div>
                  <dt>Pre-travel</dt>
                  <dd>{activeSwitch.nominalPretravel}</dd>
                </div>
                <div>
                  <dt>Total travel</dt>
                  <dd>{activeSwitch.nominalTotalTravel}</dd>
                </div>
              </dl>

              <section
                className="kf-switch-details"
                aria-label="Force curve and technical details"
              >
                <h4 className="kf-switch-details__heading">
                  Force curve &amp; technical details
                </h4>
                <div className="kf-switch-details__body">
                  {controlsReady && (
                    <Suspense fallback={null}>
                      <SwitchLabCurve activeSwitch={activeSwitch} curveDomRef={curveDomRef} />
                    </Suspense>
                  )}
                </div>
              </section>

              <div className="kf-switch-lab__footer">
                <span className="kf-caption kf-switch-lab__status">
                  {selectedStudioSwitch === activeSwitch.id
                    ? 'Selected in Build Studio'
                    : 'Preview only until applied'}
                </span>
                <Button
                  variant="primary"
                  onClick={() => {
                    onApplyToStudio(activeSwitch.id);
                    document.getElementById('build-studio')?.scrollIntoView();
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
