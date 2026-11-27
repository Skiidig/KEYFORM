import { allowsAutomaticRuntime, evaluateRuntimeAvailability, runtimeDevice, stageVisibilityThreshold } from './capabilities';
import { acquireRendererLease, scheduleAutomaticRenderer } from './rendererLease';
import type { StationState, ViewportMode, ViewportMount, ViewportRuntimeAdapter, ViewportStationId } from './types';

const dwellMs = 500;
const offscreenGraceMs = 250;
const inputGraceMs = 500;
const suppressed = new Set<ViewportStationId>();

const failures: Record<Parameters<ViewportMount['fail']>[0], string> = {
  renderer: '3D preview is unavailable on this device.',
  asset: '3D preview could not load.',
  'context-lost': '3D preview lost its graphics connection.',
};

export function createViewportLifecycle<K extends ViewportStationId>(
  station: K,
  container: HTMLDivElement,
  state: () => StationState[K],
  setMode: (mode: ViewportMode) => void,
  setMessage: (message: string) => void,
) {
  const lifetime = new AbortController();
  const options = { signal: lifetime.signal };
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  const section = container.closest('section') ?? container;
  const held = new Set<number | string>();
  let lastInput = -Infinity;
  let adapter: ViewportRuntimeAdapter<StationState[K]> | undefined;
  let release: (() => void) | undefined;
  let automatic = false;
  let ready = false;
  let intersection: IntersectionObserverEntry | undefined;
  let eligibleSince: number | undefined;
  let offscreenSince: number | undefined;
  let timer: number | undefined;
  const activate = () => {
    if (lifetime.signal.aborted) return;
    if (eligible()) void start(true);
    else reconcile();
  };

  function visibleFraction() {
    const { left, top, right, bottom, width, height } = container.getBoundingClientRect();
    const visibleWidth = Math.max(0, Math.min(right, document.documentElement.clientWidth) - Math.max(left, 0));
    const visibleHeight = Math.max(0, Math.min(bottom, document.documentElement.clientHeight) - Math.max(top, 0));
    return width > 0 && height > 0 ? visibleWidth * visibleHeight / (width * height) : 0;
  }

  function eligible() {
    // Recheck geometry if the browser has yet to deliver a queued observer entry.
    return !suppressed.has(station) && !document.hidden && motion.matches && allowsAutomaticRuntime()
      && Boolean(intersection && intersection.intersectionRatio >= stageVisibilityThreshold)
      && visibleFraction() >= stageVisibilityThreshold;
  }

  function reconcile(observedAt = performance.now()) {
    clearTimeout(timer);
    if (lifetime.signal.aborted || (release && !automatic)) return;
    const now = performance.now();
    const canStart = eligible();
    if (!canStart) eligibleSince = undefined;

    if (release) {
      if (!ready) {
        if (!canStart) release();
        return;
      }
      if (intersection?.intersectionRatio && !document.hidden) {
        offscreenSince = undefined;
        return;
      }
      offscreenSince ??= now;
      if (held.size) return;
      const remaining = Math.max(offscreenSince + offscreenGraceMs, lastInput + inputGraceMs) - now;
      if (remaining > 0) timer = window.setTimeout(reconcile, remaining);
      else if (document.hidden || visibleFraction() === 0) release();
      return;
    }

    if (canStart) eligibleSince ??= observedAt;
    scheduleAutomaticRenderer(station, activate, eligibleSince === undefined ? undefined : eligibleSince + dwellMs);
  }

  async function start(fromViewport: boolean) {
    const availability = evaluateRuntimeAvailability(true);
    if (!availability.available) {
      if (!fromViewport) {
        setMessage(availability.reason);
        setMode('runtime-error');
      }
      return;
    }

    const attempt = new AbortController();
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = (event: MediaQueryListEvent) => adapter?.setReducedMotion(event.matches);
    const owned = acquireRendererLease(() => {
      attempt.abort();
      media.removeEventListener('change', updateMotion);
      adapter?.dispose();
      adapter = undefined;
      release = undefined;
      automatic = ready = false;
      eligibleSince = offscreenSince = undefined;
      held.clear();
      lastInput = -Infinity;
      if (!lifetime.signal.aborted) {
        setMode('static-fallback');
        reconcile();
      }
    }, fromViewport);
    if (!owned) return;
    release = owned;
    scheduleAutomaticRenderer(station, activate);
    automatic = fromViewport;
    media.addEventListener('change', updateMotion);

    const canContinue = () => {
      if (attempt.signal.aborted) return false;
      if (!automatic || eligible()) return true;
      owned();
      return false;
    };
    const fail: ViewportMount['fail'] = (code) => {
      if (attempt.signal.aborted || (!ready && !canContinue())) return;
      suppressed.add(station);
      owned();
      setMessage(failures[code]);
      setMode('runtime-error');
    };

    setMessage('Preparing 3D preview…');
    setMode('loading-runtime');
    try {
      const { createViewportAdapter } = await import('./three/viewportAdapter');
      if (!canContinue()) return;
      adapter = createViewportAdapter(station);
      await adapter.mount(container, state(), {
        signal: attempt.signal,
        reducedMotion: media.matches,
        progress: (next) => { if (!attempt.signal.aborted) setMessage(next); },
        get automatic() { return automatic; },
        canContinue,
        fail,
      });
      if (!canContinue()) return;
      ready = true;
      setMode('interactive-3d');
    } catch {
      fail('asset');
    }
  }

  const onEligibilityChange = () => reconcile();
  motion.addEventListener('change', onEligibilityChange, options);
  runtimeDevice().connection?.addEventListener?.('change', onEligibilityChange, options);
  window.addEventListener('online', onEligibilityChange, options);
  window.addEventListener('offline', onEligibilityChange, options);

  const clearInput = () => { held.clear(); reconcile(); };
  document.addEventListener('visibilitychange', clearInput, options);
  window.addEventListener('blur', clearInput, options);
  const capture = { ...options, capture: true };
  const press = (event: Event) => {
    if (!event.isTrusted || !automatic || !ready) return;
    if (event instanceof PointerEvent && event.type === 'pointerdown') held.add(event.pointerId);
    if (event instanceof KeyboardEvent) held.add(event.code);
    lastInput = performance.now();
    reconcile();
  };
  const end = (event: PointerEvent | KeyboardEvent) => {
    if (held.delete(event instanceof PointerEvent ? event.pointerId : event.code)) {
      lastInput = performance.now();
      reconcile();
    }
  };
  for (const type of ['pointerdown', 'keydown', 'click', 'wheel']) {
    section.addEventListener(type, press, { ...capture, passive: true });
  }
  window.addEventListener('pointerup', end, capture);
  window.addEventListener('pointercancel', end, capture);
  window.addEventListener('keyup', end, capture);

  return {
    observe(entry: IntersectionObserverEntry) {
      intersection = entry;
      reconcile(entry.time);
    },
    toggle(close: boolean) {
      if (close) {
        suppressed.add(station);
        scheduleAutomaticRenderer(station, activate);
        release?.();
      } else if (!release) {
        void start(false);
      } else {
        // A click on the static button can race automatic acquisition. Keep that load and honor the click.
        automatic = false;
      }
    },
    update(next: StationState[K]) { adapter?.update(next); },
    reset() { adapter?.resetView?.(); },
    dispose() {
      lifetime.abort();
      clearTimeout(timer);
      scheduleAutomaticRenderer(station, activate);
      release?.();
    },
  };
}

export type ViewportLifecycle<K extends ViewportStationId> = ReturnType<typeof createViewportLifecycle<K>>;
