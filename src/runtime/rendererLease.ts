import type { ViewportStationId } from './types';

const stationOrder: Record<ViewportStationId, number> = {
  'mechanical-anatomy': 0,
  'switch-lab': 1,
  'build-studio': 2,
};
type Candidate = { station: ViewportStationId; deadline: number; activate: () => void };
const candidates = new Map<() => void, Candidate>();
let releaseCurrent: (() => void) | undefined;
let timer: number | undefined;

function scheduleNext() {
  clearTimeout(timer);
  if (releaseCurrent) return;
  let next: Candidate | undefined;
  for (const candidate of candidates.values()) {
    if (!next || candidate.deadline < next.deadline ||
      (candidate.deadline === next.deadline && stationOrder[candidate.station] < stationOrder[next.station])) {
      next = candidate;
    }
  }
  if (!next) return;
  const { deadline, activate } = next;
  timer = window.setTimeout(() => {
    if (performance.now() >= deadline) {
      candidates.delete(activate);
      activate();
    }
    scheduleNext();
  }, Math.max(0, Math.ceil(deadline - performance.now())));
}

export function scheduleAutomaticRenderer(station: ViewportStationId, activate: () => void, deadline?: number) {
  if (deadline === undefined) {
    if (!candidates.delete(activate)) return;
  } else {
    candidates.set(activate, { station, deadline, activate });
  }
  scheduleNext();
}

/** Revocation is synchronous so a new station never overlaps an owned renderer. */
export function acquireRendererLease(dispose: () => void, automatic: boolean) {
  if (automatic && releaseCurrent) return;
  releaseCurrent?.();
  const release = () => {
    if (releaseCurrent !== release) return;
    releaseCurrent = undefined;
    dispose();
    scheduleNext();
  };
  releaseCurrent = release;
  scheduleNext();
  return release;
}
