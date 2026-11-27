/**
 * KEYFORM — Motion Design Tokens (KF-004A)
 *
 * Direction: Cinematic industrial precision. Restrained, damped, purposeful.
 * Zero bounce/elastic easing by default. Camera (800ms) is reserved for future
 * WebGL runtime camera presets; Cinematic (1200ms) is the hard upper bound.
 */

export const MOTION_DURATION_MS = {
  instant: 80,
  fast: 140,
  standard: 220,
  panel: 260,
  /** WebGL camera preset transition ceiling (nearby presets 320-360ms, large moves 420ms) */
  camera: 420,
  /** Full assembly explode duration */
  cinematic: 500,
} as const;

export const MOTION_EASING = {
  precision: 'cubic-bezier(0.2, 0.75, 0.25, 1)',
  mechanical: 'cubic-bezier(0.4, 0, 0.2, 1)',
  cinematic: 'cubic-bezier(0.65, 0, 0.25, 1)',
  linear: 'linear',
} as const;

export type MotionDurationKey = keyof typeof MOTION_DURATION_MS;
export type MotionEasingKey = keyof typeof MOTION_EASING;
