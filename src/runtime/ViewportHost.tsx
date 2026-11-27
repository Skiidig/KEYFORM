import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ResponsiveImage } from '../components/ui/ResponsiveImage';
import { evaluateRuntimeAvailability } from './capabilities';
import { acquireRendererLease } from './rendererLease';
import type {
  StationState, StaticFallbackDescriptor, ViewportMode, ViewportMount, ViewportRuntimeAdapter, ViewportStationId,
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
  onModeChange?: (mode: ViewportMode) => void;
}

const failures: Record<Parameters<ViewportMount['fail']>[0], string> = {
  renderer: '3D preview is unavailable on this device.',
  asset: '3D preview could not load.',
  'context-lost': '3D preview lost its graphics connection.',
};

export function ViewportHost<K extends ViewportStationId>({
  station, state, fallback, className = '', imgClassName = '', imgStyle, priority = false,
  children, activeControls, onModeChange,
}: ViewportHostProps<K>) {
  const slot = useRef<HTMLDivElement>(null);
  const releaseRef = useRef<() => void>(undefined);
  const adapterRef = useRef<ViewportRuntimeAdapter<StationState[K]>>(undefined);
  const latestState = useRef(state);
  const mounted = useRef(false);
  const [mode, setMode] = useState<ViewportMode>('static-fallback');
  const [message, setMessage] = useState('');

  useLayoutEffect(() => {
    latestState.current = state;
    adapterRef.current?.update(state);
  }, [state]);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      releaseRef.current?.();
    };
  }, []);

  useEffect(() => onModeChange?.(mode), [mode, onModeChange]);

  const start = async () => {
    const availability = evaluateRuntimeAvailability(true);
    const container = slot.current;
    if (!availability.available || !container) {
      setMessage(availability.reason);
      setMode('runtime-error');
      return;
    }
    const abort = new AbortController();
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = (event: MediaQueryListEvent) => adapterRef.current?.setReducedMotion(event.matches);
    const release = acquireRendererLease(() => {
      abort.abort();
      media.removeEventListener('change', updateMotion);
      adapterRef.current?.dispose();
      adapterRef.current = undefined;
      releaseRef.current = undefined;
      if (mounted.current) setMode('static-fallback');
    });
    releaseRef.current = release;
    media.addEventListener('change', updateMotion);
    const fail: ViewportMount['fail'] = (code) => {
      if (abort.signal.aborted) return;
      release();
      setMessage(failures[code]);
      setMode('runtime-error');
    };
    setMessage('Preparing 3D preview…');
    setMode('loading-runtime');
    try {
      const { createViewportAdapter } = await import('./three/viewportAdapter');
      if (abort.signal.aborted) return;
      const adapter = createViewportAdapter(station);
      adapterRef.current = adapter;
      await adapter.mount(container, latestState.current, {
        signal: abort.signal,
        reducedMotion: media.matches,
        progress: (next) => { if (!abort.signal.aborted) setMessage(next); },
        fail,
      });
      if (!abort.signal.aborted) setMode('interactive-3d');
    } catch {
      fail('asset');
    }
  };
  const interactive = mode === 'interactive-3d';
  const loading = mode === 'loading-runtime';

  return (
    <div
      className={`kf-viewport-host ${className}`.trim()}
      data-kf-viewport={station}
      data-kf-viewport-mode={mode}
      data-kf-preview-match={interactive ? undefined : fallback.match}
    >
      <div ref={slot} className="kf-viewport-host__canvas-slot" aria-hidden={!interactive} />
      {!interactive && (
        <ResponsiveImage
          key={fallback.shotId}
          shotId={fallback.shotId}
          sizes={fallback.sizes}
          alt={fallback.alt}
          className={`kf-viewport-host__img ${imgClassName}`.trim()}
          style={imgStyle}
          priority={priority}
        />
      )}
      {children}
      <div className="kf-viewport-host__controls">
        {interactive && activeControls}
        <button className="kf-viewport-host__action" type="button"
          onClick={interactive || loading ? () => releaseRef.current?.() : start}>
          {interactive ? 'Close 3D' : loading ? 'Cancel 3D' : mode === 'runtime-error' ? 'Retry 3D' : 'View in 3D'}
        </button>
      </div>
      {(loading || mode === 'runtime-error') && (
        <span className="kf-viewport-host__feedback" role="status">{message}</span>
      )}
    </div>
  );
}
