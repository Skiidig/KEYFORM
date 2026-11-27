# KEYFORM — KF-QUALITY-002C: Final Motion Craftsmanship

## 1. Context & Preserved Foundations

Continuing from the committed `KF-ART-002B` photography checkpoint (`d4d36de`) on `integration/kf004b-production`, `KF-QUALITY-002C` delivers restrained, time-based 3D and editorial motion craftsmanship without adding features or changing loading contracts.

- **Frozen & preserved:** All `120/120` verified production assets (including `A01` desktop Hero, `H02` mobile Hero, `C02`/`C02Mobile` cinematic Closing, GLBs, legend atlases, and CC0 WAV audio) remain byte-identical. Explicit `View in 3D` WebGL activation, single-renderer ownership, photography-until-first-frame fallback, and the single-entry-script contract remain untouched. Automatic Build Studio 3D activation remains explicitly deferred.

---

## 2. Implemented Motion Behavior

### 2.1 Time-Based Orbit Damping (`src/runtime/three/NativeStage.ts`)
- **Dual-camera architecture:** `OrbitControls` (`enableDamping = false`) drives an internal `orbitInputCamera` across pointer drag, touch drag, wheel, and `Shift + Arrow` keyboard input, while `NativeStage` smooths the displayed `camera` pose inside the existing on-demand `requestAnimationFrame` loop.
- **Tuned dynamics:** Exponential elapsed-time half-life **`45 ms`** (`ORBIT_DAMPING_HALF_LIFE_MS = 45`) with a hard **`250 ms`** maximum settling tail (`ORBIT_MAX_SETTLE_MS = 250`).
- **Direct zoom:** Radial distance updates immediately on wheel/pinch zoom with zero lingering damping tail; only angular orientation (`theta`, `phi`) and pan target damp smoothly.
- **Exact convergence & zero idle:** Snaps cleanly to the input pose at convergence (`angle < 0.0004 rad`, `target < 0.0002 m`) or `250 ms`, terminating the demand loop immediately (`0` draws over `2.0 s` idle).
- **Mutual exclusivity & seamless interruption:** Starting a camera preset clears orbit damping; user `start` input cancels any active preset transition and rebases `orbitInputCamera` from the exact displayed camera pose with zero jump.
- **Lifecycle & shadow discipline:** Pending motion clears immediately on live `prefers-reduced-motion` changes, lease revocation, context loss, and `dispose()` (`0` post-disposal draws). Orbit damping never marks `shadowDirty`, triggering **`0` shadow bakes**.

### 2.2 Elapsed-Time Explode Animation (`src/runtime/three/ProductionScene.ts`)
- Replaced frame-dependent `diff * 0.18` interpolation with elapsed-time animation (`EXPLODE_DURATION_MS = 500`) using monotonic cubic ease-in-out (`easeInOutCubic`, zero overshoot).
- **Mid-flight reversal:** Calling `setExplodeTarget` mid-animation rebases smoothly from the displayed `explodeCurrent` and scales duration proportionally to remaining distance (`Math.max(1, Math.round(500 * distance))`).
- **Exact endpoints & shadow coalescing:** Snaps deterministically to exact `0` or `1` (`u >= 1 - 1e-6`), preserves all 9 assembly group paths, `KF01_Gasket_TravelWithPlate` (`+22 mm`), occlusion culling, focus ghosting, and selection outlines, and coalesces at most **one** cached shadow bake when assembly settles. Instant snap applies on first presentation and reduced motion.

### 2.3 Spherical Non-Clipping Camera Transitions (`src/runtime/three/lighting.ts`, `NativeStage.ts`)
- **Adaptive durations:** Nearby presets (`Studio ¾ ↔ Exploded`: `329 ms`) and small resets settle in **`320–360 ms`**; larger angular or distance moves (`Studio ¾ ↔ Rear`: `420 ms`) take **`420 ms`**, using monotonic `easeInOutCubic` without overshoot.
- **Identical-pose skip:** Skips animation completely when target pose delta is below `1e-4 m` / `1e-3°` FOV.
- **Non-clipping spherical arc:** Interpolates spherical `(radius, phi, theta)` around the interpolated target (shortest azimuth path, safe polar clamp `[0.06, 0.49π]`, conservative `Math.min(fromNear, toNear)` mid-flight) so front-to-rear transitions sweep cleanly around the keyboard without intersecting geometry or floor.
- Preserves resize refits, Build Studio `72 px` bottom-HUD frustum inset refits, instant first presentation, and live reduced-motion snaps.

### 2.4 Editorial Motion Refinement (`src/styles/motion.css`, `src/motion/tokens.ts`, `MechanicalAnatomy.tsx`, `SwitchLab.tsx`, `BuildStudio.tsx`)
- Removed whole-layout `useReveal` / `.kf-reveal` wrappers from all three interactive 3D workspaces (`MechanicalAnatomy`, `SwitchLab`, `BuildStudio`) so interactive stations render immediately without whole-workspace fade/slide transitions.
- Kept a subtler `.kf-reveal` (`220 ms`, `6 px`, `ease-precision`) strictly on non-interactive editorial grids (`EngineeringBento`, `MaterialLibrary`), keeping Hero photography 100% visible on first paint and preserving strict `prefers-reduced-motion` zero-motion compliance.
- Updated motion duration tokens (`--kf-dur-fast: 140ms`, `--kf-dur-standard: 220ms`, `--kf-dur-panel: 260ms`, `--kf-dur-camera: 420ms`, `--kf-dur-cinematic: 500ms`) with zero new dependencies.

---

## 3. Motion Timing & Verification Evidence

All nine repository verification suites passed on the final build (`Node 26.13.1`, `npm 11.20.0`, `ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11)`):

| Suite | Result | Key Metrics |
| :--- | :--- | :--- |
| `npm run typecheck` | **PASS** | `0` errors |
| `npm run build` | **PASS** | `2.25 s` |
| `npm run verify:assets` | **PASS (`120/120`)** | All `120` assets untouched (`runtimeBytes: 7,702,606`, `audioBytes: 341,600`, `404` check) |
| `npm run verify:browser` | **PASS** | 5 viewports (`1440/768/440/390/320 px`), `0` overflow, `1` initial script, `0` initial WebGL/audio, `A01`/`H02` verified |
| `npm run verify:runtime` | **PASS (`19/19`)** | Includes live pointer drag damping, touch drag damping (`390×844`), wheel zoom, `2 s` zero-idle settle, live reduced-motion snap, lease handoff, abort, context loss |
| `npm run verify:runtime -- --strict` | **PASS (`18/18`)** | React development StrictMode |
| `npm run verify:mechanics` | **PASS (`68/68`)** | `60` baseline + `8` new motion timing/lifecycle assertions; `57` exterior / `102` exploded draws; flat `[58, 6, 12]` across 4 remounts; `0` idle frames over `3.5 s` and `2.0 s` post-orbit |
| `npm run verify:kf005` | **PASS (`33/33`)** | Settle-aware Switch Lab actuation, curve sync, audio bank, Anatomy 9-layer focus |
| `npm run verify:kf006a` | **PASS (`26/26`)** | All 18 Build Studio choices, `Matched` swatch, internals, mobile `390 px`, `0` console errors |

### Synthetic 30 / 60 / 120 Hz Timing Measurements (from `.tmp/p1-evidence/mechanical.json`)
- **Full explode (`0 → 1`):** `30 Hz`: **`500.0 ms`** · `60 Hz`: **`500.0 ms`** · `120 Hz`: **`500.0 ms`** (exact monotonic `easeInOutCubic` curve match, exact endpoint `1.0`).
- **Mid-flight explode reversal (`t = 200 ms`, `progress = 0.256 → 0`):** expected `128 ms`, settled in **`133.3 ms`** (`60 Hz`), exact assembled restoration, **`0` shadow bakes mid-flight**, **`1` coalesced cached shadow bake** on settle.
- **Camera preset transitions:** nearby `Studio ¾ → Exploded`: **`329 ms`**; large `Studio ¾ → Rear` (`420 ms` target): `30 Hz`: **`433.3 ms`** · `60 Hz`: **`433.3 ms`** · `120 Hz`: **`425.0 ms`**, zero clipping (`y >= 0.04 m`, `dist >= 0.28 m` at every frame), identical pose skipped.
- **Orbit damping (`Shift + ArrowRight` at `60 Hz`):** settled in **`216.7 ms`** (`≤ 250 ms`), **`0` shadow bakes**, **`0` draws over `2.05 s` idle**.
- **Disposal during active animation:** **`0` post-disposal draws** over `120 ms`.

---

## 4. Bundle & Performance Measurements (Gzip Level 9)

- **Aggregate initial JS transfer (`index-CUru9t_J.js`, single entry script):** **`89,683 B`** (`-2 B` vs. `89,685 B` ART-002B baseline, `≤ 90,000 B` **PASS**)
- **Initial CSS (`index-DHjWjTl-.css`):** `14,340 B` (`+8 B`)
- **Lazy native runtime (`viewportAdapter-bz5eSyzN.js`):** **`192,203 B`** (`+1,611 B` vs. `190,592 B`, `≤ 220,000 B` **PASS**)
- **Lazy chunks:** `buildConfigRuntime` `1,635 B`, `SwitchLabInteractive` `2,873 B`, `SwitchLabAudioPanel` `4,181 B`, `DesignSystemPreview` `5,783 B`, `digest` `209 B`; total `dist`: `14,190,339 B`.

---

## 5. Known Limitations & Open KF-007 Gates

- Desktop mobile emulation verifies touch event dispatch, layout, overflow, and demand settle mechanics, not physical handset frame pacing or thermals.
- Clean isolated RTX 4060 GPU execution timing, physical mobile testing, integrated-GPU laptop validation, Node 22.x lock parity, Lighthouse/Core Web Vitals, and full accessibility audit remain open `KF-007` release gates.
- Automatic Build Studio 3D activation remains explicitly deferred.
