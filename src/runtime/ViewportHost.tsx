import React, { useEffect, useRef, useState } from 'react';
import { ResponsiveImage } from '../components/ui/ResponsiveImage';
import { evaluateRuntimeAvailability } from './capabilities';
import type {
  StaticFallbackDescriptor,
  ViewportLoadProgress,
  ViewportMode,
  ViewportRuntimeAdapter,
  ViewportStationId,
} from './types';

export interface ViewportHostProps<TState> {
  station: ViewportStationId;
  state: TState;
  fallback: StaticFallbackDescriptor;
  /** Optional future Three.js runtime adapter; omitted in KF-004A static foundation */
  adapter?: ViewportRuntimeAdapter<TState>;
  className?: string;
  imgClassName?: string;
  imgStyle?: React.CSSProperties;
  priority?: boolean;
  /** Optional overlay elements (e.g., stratum indicator or HUD) */
  children?: React.ReactNode;
}

/**
 * Unified viewport host for Mechanical Anatomy, Switch Lab, and Build Studio.
 * Renders responsive KF-003B static production imagery immediately and provides
 * explicit loading, error, and adapter mount boundaries for future WebGL integration.
 */
export function ViewportHost<TState>({
  station,
  state,
  fallback,
  adapter,
  className = '',
  imgClassName = '',
  imgStyle,
  priority = false,
  children,
}: ViewportHostProps<TState>) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<ViewportMode>('static-fallback');
  const [progress, setProgress] = useState<ViewportLoadProgress>({ phase: 'idle' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!adapter) {
      setMode('static-fallback');
      return;
    }

    const availability = evaluateRuntimeAvailability(true);
    if (!availability.available || !canvasRef.current) {
      setMode('static-fallback');
      return;
    }

    let cancelled = false;
    setMode('loading-runtime');
    setProgress({ phase: 'loading-glb', message: 'Initializing 3D viewport' });

    adapter
      .mount(canvasRef.current, state)
      .then(() => {
        if (cancelled) return;
        adapter.setReducedMotion(availability.capability.reducedMotion);
        setMode('interactive-3d');
        setProgress({ phase: 'ready' });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Interactive 3D unavailable';
        setErrorMessage(msg);
        setMode('runtime-error');
        setProgress({ phase: 'error', message: msg });
      });

    return () => {
      cancelled = true;
      adapter.dispose();
    };
    // Mount lifecycle is keyed strictly to adapter identity and station.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, station]);

  useEffect(() => {
    if (adapter && mode === 'interactive-3d') {
      adapter.update(state);
    }
  }, [adapter, mode, state]);

  const showStaticFallback = mode !== 'interactive-3d';

  return (
    <div
      className={`kf-viewport-host ${className}`.trim()}
      data-kf-viewport={station}
      data-kf-viewport-mode={mode}
      data-kf-preview-match={fallback.match}
    >
      {/* Future WebGL canvas mount target (inert and hidden while in static-fallback) */}
      <div
        ref={canvasRef}
        className="kf-viewport-host__canvas-slot"
        aria-hidden={showStaticFallback}
      />

      {showStaticFallback && (
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

      {mode === 'loading-runtime' && (
        <div className="kf-viewport-host__status-layer" role="status" aria-live="polite">
          <span className="kf-micro">{progress.message ?? 'Loading 3D viewport…'}</span>
        </div>
      )}

      {mode === 'runtime-error' && errorMessage && (
        <div className="kf-viewport-host__error-bar" role="status" aria-live="polite">
          <span>Static fallback active · {errorMessage}</span>
        </div>
      )}

      {children}
    </div>
  );
}
