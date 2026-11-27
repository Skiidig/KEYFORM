import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import type { SwitchAudioBridge } from '../../audio/SwitchLabAudioPanel';
import type { SwitchProfile } from '../../data/kf01Data';
import type { HeroSwitchActuationPhase } from '../../runtime/types';
import { Button } from '../ui/Button';

const SwitchLabAudioPanel = lazy(() =>
  import('../../audio/SwitchLabAudioPanel').then((m) => ({ default: m.SwitchLabAudioPanel })),
);

export interface SwitchTravelController {
  onSample(mm: number, phase: HeroSwitchActuationPhase): void;
  reset(): void;
}

export interface SwitchCurveDomRefs {
  line: SVGLineElement | null;
  dot: SVGCircleElement | null;
  readout: HTMLSpanElement | null;
}

interface SwitchLabInteractiveProps {
  activeSwitch: SwitchProfile;
  interactive: boolean;
  isPressed: boolean;
  onPressChange: (pressed: boolean) => void;
  onEnsureAssembled: () => void;
  controllerRef: React.MutableRefObject<SwitchTravelController | null>;
  curveDomRef: React.MutableRefObject<SwitchCurveDomRefs>;
}

const CURVE_SPECS: Record<
  SwitchProfile['id'],
  { actuationGf: number; pretravelMm: number; totalTravelMm: number; path: string }
> = {
  'linear-45': { actuationGf: 45, pretravelMm: 2.0, totalTravelMm: 4.0, path: 'M34 62 L148 45 L262 30' },
  'tactile-58': {
    actuationGf: 58,
    pretravelMm: 2.0,
    totalTravelMm: 3.8,
    path: 'M34 59 C62 56 72 30 91 30 C112 30 124 44 148 43 L251 23',
  },
  'silent-50': { actuationGf: 50, pretravelMm: 1.9, totalTravelMm: 3.7, path: 'M34 57 L142 39 Q214 31 245 25' },
};

function curveForce(id: SwitchProfile['id'], mm: number): number {
  if (id === 'linear-45') return 30 + mm * 7;
  if (id === 'silent-50') return 34 + (mm / 3.7) * 28;
  return mm <= 1
    ? 32 + Math.sin(mm * 1.5708) * 26
    : mm <= 2
      ? 58 - Math.sin((mm - 1) * 1.5708) * 12
      : 46 + ((mm - 2) / 1.8) * 18;
}

export const SwitchLabCurve: React.FC<{
  activeSwitch: SwitchProfile;
  curveDomRef: React.MutableRefObject<SwitchCurveDomRefs>;
}> = ({ activeSwitch, curveDomRef }) => {
  const spec = CURVE_SPECS[activeSwitch.id];
  const actX = 34 + spec.pretravelMm * 57;
  const actY = 96 - (curveForce(activeSwitch.id, spec.pretravelMm) / 70) * 80;
  const endX = 34 + spec.totalTravelMm * 57;

  return (
    <>
      <div className="kf-switch-curve-slot">
        <div className="kf-curve-card">
          <div className="kf-curve-card__head">
            <span className="kf-label kf-curve-card__title">Conceptual force-travel curve</span>
            <span
              className="kf-code kf-curve-card__readout"
              ref={(el) => {
                curveDomRef.current.readout = el;
              }}
            >
              0.0 / {spec.totalTravelMm.toFixed(1)} mm
            </span>
          </div>
          <svg
            className="kf-curve-svg"
            viewBox="0 0 280 120"
            role="img"
            aria-label={`Conceptual ${activeSwitch.name} force-travel curve: ${activeSwitch.nominalForce} at ${activeSwitch.nominalPretravel}, ${activeSwitch.nominalTotalTravel} total. Nominal design target, not laboratory measured.`}
          >
            <path d="M34 73.1H262M34 50.3H262M34 27.4H262" className="kf-curve-grid" />
            <path d="M34 16V96H262" className="kf-curve-baseline" />
            <text x="6" y="20" className="kf-curve-axis">gf</text>
            <text x="28" y="76" textAnchor="end" className="kf-curve-axis">20</text>
            <text x="28" y="53" textAnchor="end" className="kf-curve-axis">40</text>
            <text x="28" y="30" textAnchor="end" className="kf-curve-axis">60</text>
            <text x="34" y="112" textAnchor="middle" className="kf-curve-axis">0 mm</text>
            <text x="91" y="112" textAnchor="middle" className="kf-curve-axis">1</text>
            <text x="148" y="112" textAnchor="middle" className="kf-curve-axis">2</text>
            <text x="205" y="112" textAnchor="middle" className="kf-curve-axis">3</text>
            <text x="262" y="112" textAnchor="middle" className="kf-curve-axis">4 mm</text>
            <line x1={actX} y1="16" x2={actX} y2="96" className="kf-curve-ref" />
            <line x1={endX} y1="16" x2={endX} y2="96" className="kf-curve-stop" />
            <path d={spec.path} className="kf-curve-path" />
            <circle cx={actX} cy={actY} r="3" className="kf-curve-act" />
            <line
              ref={(el) => {
                curveDomRef.current.line = el;
              }}
              x1="34"
              y1="16"
              x2="34"
              y2="96"
              className="kf-curve-cursor"
            />
            <circle
              ref={(el) => {
                curveDomRef.current.dot = el;
              }}
              cx="34"
              cy="60"
              r="4"
              className="kf-curve-dot"
            />
          </svg>
          <p className="kf-curve-card__note">
            Nominal design target ({activeSwitch.nominalForce} @ {activeSwitch.nominalPretravel}; {activeSwitch.nominalTotalTravel} total). Not laboratory measured.
          </p>
        </div>
      </div>

      <dl className="kf-switch-notes">
        <div>
          <dt>Stem</dt>
          <dd className="kf-switch-spec__stem">
            <span className="kf-switch-spec__swatch" style={{ background: activeSwitch.stemColorHex }} aria-hidden="true" />
            {activeSwitch.stemColorName}
          </dd>
        </div>
        <div><dt>Housing</dt><dd>{activeSwitch.housingDesc}</dd></div>
        <div><dt>Best suited for</dt><dd>{activeSwitch.bestFor}</dd></div>
      </dl>
    </>
  );
};

export const SwitchLabInteractive: React.FC<SwitchLabInteractiveProps> = ({
  activeSwitch,
  interactive,
  isPressed,
  onPressChange,
  onEnsureAssembled,
  controllerRef,
  curveDomRef,
}) => {
  const [audioOpen, setAudioOpen] = useState(false);
  const swRef = useRef(activeSwitch);
  swRef.current = activeSwitch;

  const barRef = useRef<HTMLDivElement>(null);
  const audioBridgeRef = useRef<SwitchAudioBridge | null>(null);
  const pendingAudioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const travelRef = useRef(0);
  const pressedRef = useRef(isPressed);
  pressedRef.current = isPressed;

  const paintTravel = useCallback((mm: number) => {
    const sw = swRef.current;
    const spec = CURVE_SPECS[sw.id];
    const t = Math.max(0, Math.min(spec.totalTravelMm, mm));
    const x = (34 + t * 57).toFixed(1);
    const y = (96 - (curveForce(sw.id, t) / 70) * 80).toFixed(1);
    const dom = curveDomRef.current;
    dom.line?.setAttribute('x1', x);
    dom.line?.setAttribute('x2', x);
    dom.dot?.setAttribute('cx', x);
    dom.dot?.setAttribute('cy', y);
    if (dom.readout) {
      dom.readout.textContent = `${t.toFixed(1)} / ${spec.totalTravelMm.toFixed(1)} mm`;
    }
    if (barRef.current) {
      barRef.current.style.width = `${(t / spec.totalTravelMm) * 100}%`;
    }
  }, [curveDomRef]);

  const stopRaf = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const onSample = useCallback(
    (mm: number, phase: HeroSwitchActuationPhase) => {
      travelRef.current = mm;
      paintTravel(mm);
      audioBridgeRef.current?.onPhase(phase);
    },
    [paintTravel],
  );

  const reset = useCallback(() => {
    stopRaf();
    travelRef.current = 0;
    paintTravel(0);
    audioBridgeRef.current?.releaseAll();
  }, [paintTravel, stopRaf]);

  useEffect(() => {
    controllerRef.current = { onSample, reset };
    return () => {
      controllerRef.current = null;
    };
  }, [controllerRef, onSample, reset]);

  const runStatic = useCallback(
    (pressed: boolean) => {
      stopRaf();
      const sw = swRef.current;
      const target = pressed ? CURVE_SPECS[sw.id].totalTravelMm : 0;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        onSample(target, pressed ? 'bottomed' : 'idle');
        return;
      }
      const from = travelRef.current;
      const dur = pressed ? sw.pressDurationMs : sw.returnDurationMs;
      const t0 = performance.now();
      const tick = (now: number) => {
        const u = Math.min(1, Math.max(0, (now - t0) / dur));
        const val = u >= 1 ? target : from + (target - from) * (1 - (1 - u) ** 3);
        onSample(val, u >= 1 ? (pressed ? 'bottomed' : 'idle') : pressed ? 'pressing' : 'releasing');
        rafRef.current = u < 1 ? requestAnimationFrame(tick) : 0;
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [onSample, stopRaf],
  );

  const press = useCallback(() => {
    if (interactive) onEnsureAssembled();
    if (pressedRef.current) return;
    onPressChange(true);
    if (!interactive) runStatic(true);
  }, [interactive, onEnsureAssembled, onPressChange, runStatic]);

  const release = useCallback(
    (silent = false) => {
      if (silent) audioBridgeRef.current?.releaseAll();
      if (!pressedRef.current) return;
      onPressChange(false);
      if (!interactive) runStatic(false);
    },
    [interactive, onPressChange, runStatic],
  );

  useEffect(() => {
    reset();
  }, [activeSwitch.id, reset]);

  useEffect(() => {
    const onBlur = () => release(true);
    const onVis = () => {
      if (document.hidden) release(true);
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stopRaf();
      if (pendingAudioCtxRef.current && pendingAudioCtxRef.current.state !== 'closed') {
        void pendingAudioCtxRef.current.close().catch(() => undefined);
      }
      pendingAudioCtxRef.current = null;
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [release, stopRaf]);

  return (
    <>
      <div className="kf-press-tester kf-press-tester--dark">
        <div className="kf-press-tester__meter">
          <span className="kf-label kf-press-tester__label">
            {interactive ? 'Actuate 3D switch' : 'Switch travel preview'}
          </span>
          <div className="kf-travel-track kf-travel-track--dark" aria-hidden="true">
            <div ref={barRef} className="kf-travel-fill kf-travel-fill--dark" />
          </div>
        </div>
        <Button
          variant="primary"
          compact
          onPointerDown={(e) => {
            try {
              e.currentTarget.setPointerCapture?.(e.pointerId);
            } catch {
              /* synthetic or non-capturable pointer */
            }
            press();
          }}
          onPointerUp={() => release(false)}
          onPointerCancel={() => release(true)}
          onLostPointerCapture={() => release(true)}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
              e.preventDefault();
              press();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              release(false);
            }
          }}
          aria-pressed={isPressed}
        >
          {isPressed ? `${activeSwitch.nominalTotalTravel} bottom-out` : 'Hold to press switch'}
        </Button>
      </div>

      {audioOpen ? (
        <Suspense
          fallback={
            <div className="kf-audio-bar" role="region" aria-label="Representative sound preview">
              <p className="kf-audio-bar__note" role="status">Loading sound controls…</p>
            </div>
          }
        >
          <SwitchLabAudioPanel
            profile={activeSwitch.id}
            bridgeRef={audioBridgeRef}
            pendingContextRef={pendingAudioCtxRef}
            onDisable={() => setAudioOpen(false)}
          />
        </Suspense>
      ) : (
        <div className="kf-audio-bar" role="region" aria-label="Representative sound preview">
          <div className="kf-audio-bar__controls">
            <button
              type="button"
              className="kf-audio-btn"
              aria-pressed="false"
              onClick={() => {
                // Create and resume AudioContext synchronously inside the user gesture so
                // strict browser autoplay policies unlock before the lazy audio chunk mounts.
                try {
                  const Ctor = window.AudioContext;
                  if (Ctor) {
                    const ctx = new Ctor({ latencyHint: 'interactive' });
                    void ctx.resume().catch(() => undefined);
                    pendingAudioCtxRef.current = ctx;
                  }
                } catch {
                  pendingAudioCtxRef.current = null;
                }
                setAudioOpen(true);
              }}
            >
              Enable sound
            </button>
          </div>
          <p className="kf-audio-bar__note" role="status">
            Sound off by default · Representative CC0 recordings.
          </p>
        </div>
      )}
    </>
  );
};
