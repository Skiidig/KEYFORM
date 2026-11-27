import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ResponsiveImage } from '../components/ui/ResponsiveImage';
import { stageVisibilityThreshold } from './capabilities';
import type { ViewportLifecycle } from './viewportLifecycle';
import type {
  StationState, StaticFallbackDescriptor, ViewportMode, ViewportStationId,
} from './types';

interface ViewportHostProps<K extends ViewportStationId> {
  station: K;
  state: StationState[K];
  fallback: StaticFallbackDescriptor;
  className?: string;
  imgClassName?: string;
  imgStyle?: React.CSSProperties;
  priority?: boolean;
  children?: React.ReactNode;
  activeControls?: React.ReactNode;
  resetTrigger?: number;
  onModeChange?: (mode: ViewportMode) => void;
}

let manualRevision = 0;

export function ViewportHost<K extends ViewportStationId>({
  station, state, fallback, className = '', imgClassName = '', imgStyle, priority = false,
  children, activeControls, resetTrigger = 0, onModeChange,
}: ViewportHostProps<K>) {
  const slot = useRef<HTMLDivElement>(null);
  const lifecycle = useRef<ViewportLifecycle<K>>(undefined);
  const toggle = useRef<(close: boolean) => void>(undefined);
  const latestState = useRef(state);
  const lastReset = useRef(resetTrigger);
  const [mode, setMode] = useState<ViewportMode>('static-fallback');
  const [message, setMessage] = useState('');

  useLayoutEffect(() => {
    latestState.current = state;
    lifecycle.current?.update(state);
  }, [state]);

  useEffect(() => {
    if (resetTrigger === lastReset.current) return;
    lastReset.current = resetTrigger;
    lifecycle.current?.reset();
  }, [resetTrigger]);

  useLayoutEffect(() => {
    const container = slot.current!;
    let disposed = false;
    let observed: IntersectionObserverEntry | undefined;
    let requested = false;
    const load = () => import('./viewportLifecycle').then(({ createViewportLifecycle }) => {
      if (disposed) return;
      if (!lifecycle.current) {
        lifecycle.current = createViewportLifecycle(station, container, () => latestState.current, setMode, setMessage);
        if (observed) lifecycle.current.observe(observed);
      }
      return lifecycle.current;
    });
    const observer = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver((entries) => {
      for (const entry of entries) {
        observed = entry;
        if (lifecycle.current) lifecycle.current.observe(entry);
        else if (!requested && entry.intersectionRatio >= stageVisibilityThreshold) {
          requested = true;
          void load().catch(() => {});
        }
      }
    }, { threshold: [0.001, stageVisibilityThreshold] });
    observer?.observe(container);

    toggle.current = (close) => {
      const revision = ++manualRevision;
      if (lifecycle.current) lifecycle.current.toggle(close);
      else void load().then((session) => {
        if (revision === manualRevision) session?.toggle(close);
      }).catch(() => {
        if (disposed || revision !== manualRevision) return;
        setMessage('3D preview could not load.');
        setMode('runtime-error');
      });
    };
    return () => {
      disposed = true;
      observer?.disconnect();
      lifecycle.current?.dispose();
      lifecycle.current = undefined;
    };
  }, [station]);

  useEffect(() => onModeChange?.(mode), [mode, onModeChange]);

  const interactive = mode === 'interactive-3d';
  const loading = mode === 'loading-runtime';
  const errored = mode === 'runtime-error';

  return (
    <div
      className={`kf-viewport-host ${className}`.trim()}
      data-kf-viewport={station}
      data-kf-viewport-mode={mode}
      data-kf-preview-match={interactive ? undefined : fallback.match}
      aria-busy={loading || undefined}
    >
      <div ref={slot} className="kf-viewport-host__canvas-slot" aria-hidden={!interactive} />
      <div className="kf-viewport-host__photo" aria-hidden={interactive || undefined}>
        <ResponsiveImage
          key={fallback.shotId}
          shotId={fallback.shotId}
          sizes={fallback.sizes}
          alt={fallback.alt}
          className={`kf-viewport-host__img ${imgClassName}`.trim()}
          style={imgStyle}
          priority={priority}
        />
      </div>
      {children}
      <div className="kf-viewport-host__controls">
        {interactive && activeControls}
        {interactive && (
          <button
            className="kf-viewport-host__action kf-viewport-host__action--subtle kf-viewport-host__action--reset"
            type="button"
            onClick={() => lifecycle.current?.reset()}
            aria-label="Reset camera view"
            title="Reset camera view"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3.5 8a4.5 4.5 0 1 1 1.3 3.2M3.5 8V4.5M3.5 8H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="kf-viewport-host__reset-label">Reset view</span>
          </button>
        )}
        <button
          className={`kf-viewport-host__action ${!interactive && !loading ? 'kf-viewport-host__action--activate' : ''}`.trim()}
          type="button"
          onClick={() => toggle.current?.(interactive || loading)}
        >
          {!interactive && !loading && (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 1.8 13.5 5v6L8 14.2 2.5 11V5L8 1.8Zm0 0V8m0 0 5.5-3M8 8 2.5 5" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
            </svg>
          )}
          <span>{interactive ? 'Close 3D' : loading ? 'Cancel 3D' : errored ? 'Retry 3D' : 'View in 3D'}</span>
        </button>
      </div>
      {(loading || errored) && (
        <div
          className={`kf-viewport-host__feedback ${errored ? 'kf-viewport-host__feedback--error' : ''}`.trim()}
          role="status"
          aria-live="polite"
        >
          <span>{message}</span>
          {loading && <span className="kf-viewport-host__progress" aria-hidden="true" />}
        </div>
      )}
    </div>
  );
}
