import type { RuntimeAvailability, RuntimeCapability } from './types';

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
}

export const stageVisibilityThreshold = 0.35;

export const runtimeDevice = () => navigator as Navigator & {
  connection?: NetworkInformationLike & EventTarget;
  deviceMemory?: number;
};

export function allowsAutomaticRuntime() {
  const { connection, deviceMemory, hardwareConcurrency, onLine } = runtimeDevice();
  return typeof window.WebGL2RenderingContext !== 'undefined' && onLine && !connection?.saveData
    && (!connection?.effectiveType || connection.effectiveType === '4g')
    && (connection?.downlink === undefined || connection.downlink >= 1.5)
    && (!deviceMemory || deviceMemory > 4) && (!hardwareConcurrency || hardwareConcurrency > 2);
}

/**
 * Non-invasive environment capability probe.
 * Does NOT allocate a WebGL2 context during KF-004A static foundation load;
 * checks API presence and user preferences cleanly so initial paint stays zero-GPU.
 */
export function detectRuntimeCapability(
  runtimeAdapterRegistered = false,
): RuntimeCapability {
  if (typeof window === 'undefined') {
    return {
      webgl2Supported: false,
      reducedMotion: false,
      saveData: false,
      runtimeAdapterRegistered,
    };
  }

  const webgl2Supported = typeof window.WebGL2RenderingContext !== 'undefined';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(runtimeDevice().connection?.saveData);

  return {
    webgl2Supported,
    reducedMotion,
    saveData,
    runtimeAdapterRegistered,
  };
}

export function evaluateRuntimeAvailability(
  runtimeAdapterRegistered = false,
): RuntimeAvailability {
  const capability = detectRuntimeCapability(runtimeAdapterRegistered);

  if (!capability.runtimeAdapterRegistered) {
    return {
      available: false,
      reason: 'Static KF-003B production imagery active; interactive WebGL runtime attaches in a subsequent milestone.',
      capability,
    };
  }

  if (capability.saveData) {
    return {
      available: false,
      reason: 'Data-saver preference detected; static production preview active.',
      capability,
    };
  }

  if (!capability.webgl2Supported) {
    return {
      available: false,
      reason: 'WebGL2 unavailable in this browser environment; static production preview active.',
      capability,
    };
  }

  return {
    available: true,
    reason: 'WebGL2 runtime eligible.',
    capability,
  };
}
