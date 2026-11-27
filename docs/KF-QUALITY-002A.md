# KEYFORM — KF-QUALITY-002A: Real-Time Visual Fidelity

## 1. Context & Feature Freeze

Following the read-only `KF-QUALITY-001` Premium Experience Audit on checkpoint `7cc85d07c7b3e5773e9cd84daeea1ee7c966cb90` (`integration/kf004b-production`), KEYFORM entered a **feature freeze**. The release objective shifted from expanding configurator functionality to elevating visual craft, editorial restraint, and flagship product fidelity.

- **Preserved features:** Editorial showcase, Engineering Bento, Interactive Mechanical Anatomy (9-layer inspection), Switch Lab (real-time actuation, conceptual force-travel curves, recorded CC0 audio), Build Studio live material configuration, Material Library, and Closing Statement.
- **Deferred / removed from release scope:** Individual key customization (`KF-006B`), multi-selection, arbitrary HEX keycaps, physical keyboard typing mode, rotary encoder interaction UI, undo/redo, and saved/shareable URL state (`KF-006C/D`).
- **Scope of `KF-QUALITY-002A`:** Strictly real-time 3D visual fidelity (`Q-02`, `Q-03`, `Q-04`, `Q-06`, `Q-09`, `Q-11`). No UI restructuring, layout edits, orbit damping/page motion changes, geometry/texture/photo/audio byte modifications, or new dependencies.

---

## 2. Summary of Real-Time Visual Improvements

### 2.1 Light-Studio Re-Lighting & Procedural Cyclorama Backdrop (`Q-02`)
- **`src/runtime/three/studioProfiles.ts`:** Replaced the overly uniform `neutralStudio` PMREM dome with a directional industrial product photography rig:
  - Lowered dome room luminance (`#727774`) with warm-neutral ground bounce (`#B5B2A9`) and dark grazing negative-fill flags (`#262B28`) along left/right flanks so anodized chamfers and bevels separate cleanly.
  - Replaced wide low-contrast bounce walls with six narrower, higher-intensity linear softbox strips (angled overhead key, back-left silhouette rim, right flank kicker, front-left bevel accent, overhead diffuser, and a grazing front-right kicker at `[5.0, 1.9, 4.8]` to catch the rotary encoder knurling).
  - Tightened `neutralStudio` PMREM blur sigma (`0.032 → 0.018`) for crisper metallic specular roll-off.
  - Reduced flat ambient `HemisphereLight` (`atelier`: `0.64 → 0.36`; `formFunction`: `0.84 → 0.44`) and increased directional key/rim sculpting (`atelier`: key `2.38`, fill `0.60`, rim `1.44`, `envIntensity 1.28`, exposure `1.04`; `formFunction`: key `2.22`, fill `0.72`, rim `1.38`, `envIntensity 1.32`, exposure `1.05`). `afterHours` and Switch Lab (`switchLab`) remain unchanged.
- **Studio Cyclorama (`StudioEnvironmentManager.getBackdrop`, `ProductionScene.ensureBackdrop`, `NativeStage.ts`):** Added a cached `256×256` `SRGBColorSpace` procedural studio cyclorama `CanvasTexture` for `atelier` and `formFunction` (subtle vertical tonal sweep + gentle soft radial studio center falloff; zero artificial horizon, zero post-processing pass, zero glow). Returns `THREE.Color` for `afterHours` and disposes cleanly with `StudioEnvironmentManager.dispose()`.

### 2.2 Metallic & Surface Material Calibration (`Q-02`, `Q-11`)
- **`src/runtime/three/materialCalibration.ts`:** Calibrated finishes against Cycles production photography (`A03`, `B01`, `B02`, `B03`, `A07a–c`) under the single shared studio rig (no per-finish exposure hacks):
  - **Titanium (`titanium`):** `metalness: 0.94`, `roughness: 0.24`, `clearcoat: 0.06`, `envMapIntensity: 1.72` — reads as bead-blasted machined aluminium rather than grey matte plastic.
  - **Forest (`forest`):** `metalness: 0.85`, `roughness: 0.28`, `clearcoat: 0.16`, `envMapIntensity: 1.50`.
  - **Obsidian (`obsidian`):** `metalness: 0.78`, `roughness: 0.24`, `clearcoat: 0.26`, `envMapIntensity: 1.56` — preserves chamfer readability without crushing into black.
  - **Carbon (`carbon`):** `metalness: 0.84`, `roughness: 0.34`, `clearcoat: 0.10`, `envMapIntensity: 1.48`.
  - **Brass internal weight (`MAT_Weight_Metal`):** `metalness: 1.0`, `roughness: 0.21`, `clearcoat: 0.08`, `envMapIntensity: 1.85` — warm machined brass specular response instead of flat tan.
  - **PBT keycaps (`MAT_Keycap_PBT`):** Maintained strictly dielectric (`metalness: 0`, `clearcoat: 0`), refined micro-specular grain (`roughness: 0.58`, `specularIntensity: 0.38`, `envMapIntensity: 0.86`).
  - **Rotary encoder (`Q-11`):** Retained the dark gunmetal finish identity (`#24292A`) and improved knurl ridge catchlights via higher metallic contrast and stronger baked knurl normal response (`MAT_Knob_Metal_Baked_512`: `metalness: 0.96`, `roughness: 0.19`, `clearcoat: 0.18`, `normalScale: 1.85`, `envMapIntensity: 1.85`; `MAT_Knob_Face`: `metalness: 0.95`, `roughness: 0.24`, `envMapIntensity: 1.65`).

### 2.3 Light-Keycap Legend Readability & Porcelain Tonal Separation (`Q-03`)
- **Root cause:** Linear-space `mix(cap, ink, mask)` under `AgXToneMapping` disproportionately washes out thin dark strokes on bright Porcelain (`#ECE9DF`) and Two-Tone Slate (`#D9DDD8`) keycaps compared to light-on-dark legends.
- **`src/runtime/three/legendMask.ts`:** Added luminance-gated (`kfInkLuma < kfCapLuma`) perceptual gamma-space (`2.2`) compositing with gentle optical stroke coverage compensation (`clamp(pow(kfDarkMask, 0.68) * 1.24, 0.0, 1.0)`) and slightly gentler far-distance mip fade (`1.15..2.6 * kfMaxFootprint`) strictly for dark-on-light legends. Default Charcoal PBT light-on-dark legends and `kfLegendDebug` are completely unchanged.
- **`src/runtime/three/buildConfigRuntime.ts` & `src/data/kf01Data.ts`:**
  - Deepened `DARK_LEGEND_LINEAR` from `#202524` to `#171B1A` (`[0.008023, 0.010817, 0.010187]`).
  - Deepened Porcelain PBT modifier cap tint from `#D8D4C7` to `#C2BEB2` (alphas remain warm porcelain `#ECE9DF`), giving clear alpha-to-modifier separation at overview and mobile distances without introducing artificial colors.

### 2.4 Contact Shadow Refinement & Conservative Mobile Sharpness (`Q-04`)
- **`src/runtime/three/studioProfiles.ts` & `src/runtime/three/contactShadow.ts`:**
  - Reduced studio shadow opacity (`atelier`: `0.56 → 0.40`; `formFunction`: `0.44 → 0.34`).
  - Tightened Standard cached dual-lobe contact shadow (`tight = pow(tightRaw, 0.88) * 0.88`, tighter penumbra `spread = 0.026 + 0.020 * uExplode`, soft ambient lobe weight `0.46 → 0.28`).
  - Tightened Balanced procedural analytical shadow (`uHalfExtents = (0.172, 0.088)`, `uCornerRadius = 0.012`, crisp tight core smoothstep `-0.002..0.016`, soft penumbra `-0.004..0.052`, soft weight `0.44 → 0.26`) — eliminating the heavy dark smudge halo on mobile.
- **`src/runtime/three/NativeStage.ts` (Mobile DPR A/B Decision):** Evaluated `390×844 @ 2×` Balanced rendering at `DPR 1.0`, `1.25`, and `1.5` using the existing `1024` legend atlas:
  - `1.0` (`348×232` = `80.7k px`): soft chamfers and blurred legends.
  - **`1.25` (`435×290` = `126.2k px`, `1.56×` pixels) — SELECTED:** visibly sharper bevels and readable legends while keeping conservative fill-rate headroom (`Math.min(devicePixelRatio || 1, 1.25)` naturally stays `1.0` on `1×` screens).
  - `1.5` (`522×348` = `181.7k px`, `2.25×` pixels): marginal desktop-emulation crispness gain at a significantly steeper mobile GPU fill penalty during active orbit.

### 2.5 Editorial Rear Camera Composition (`Q-06`)
- **`src/runtime/three/lighting.ts`:** Reframed `CAMERA_PRESETS.rearUsbc` from a cramped macro crop (`[-0.042, 0.048, -0.195]`, `fitHalfW: 0.068`) to an editorial rear three-quarter composition (`position: [-0.235, 0.145, -0.435]`, `target: [0.0, 0.020, -0.008]`, `fov: 26`, `near: 0.004`, `fitHalfW: 0.194`, `fitHalfH: 0.088`) matching Cycles reference `A08` — showcasing the full rear anodized edge, recessed USB-C port, angled silhouette, and brass weight hint while staying clear of the Build Studio bottom HUD.

### 2.6 Anatomy Focus Ghosting Fix (`Q-09`)
- **Root cause:** `focusGhostMaterial` used `depthWrite: false` (causing overlapping multi-layer alpha-sorting triangles) and Three.js multiplied `focusGhostMaterial.color` by per-instance `mesh.instanceColor` (`#1A1F1E` Charcoal) on instanced `MAT_Keycap_PBT` batches, leaving a stray dark square (`KF01_CapMount_Space`) visible beneath the unbatched Spacebar.
- **`src/runtime/three/ProductionScene.ts`:** Updated `focusGhostMaterial` to a single-pass Z-buffered architectural vellum (`#CFD2CB`, `roughness: 0.90`, `metalness: 0.0`, `envMapIntensity: 0.35`, `transparent: true`, `opacity: 0.28`, `depthWrite: true`) and neutralized `instanceColor` in `onBeforeCompile` (`diffuseColor.rgb = diffuse;`). Eliminated both triangle overlap noise and the stray dark box with zero extra passes or draw calls.

---

## 3. Calibrated Test Assertion Updates

Three existing assertions reflected pre-refinement constants and were updated explicitly:

| File | Previous Assertion | New Assertion | Reason |
| :--- | :--- | :--- | :--- |
| `tests/kf006a-fixture.ts:154` | `modColorPorcelain === '#d8d4c7'` | `modColorPorcelain === '#c2beb2'` | Matches deepened Porcelain modifier contrast (`Q-03`) |
| `tests/runtime-fixture.ts:161` | `balancedDpr <= 1` | `balancedDpr <= 1.25` | Matches conservative Balanced DPR cap `1.25` (`Q-04`) |
| `tests/scripts/smoke-runtime.mjs:334-343` | `canvas.width === canvas.clientWidth` (`DPR 1`) | `Math.abs(canvas.width - Math.round(canvas.clientWidth * Math.min(dpr, 1.25))) <= 1` | Matches conservative Balanced DPR cap `1.25` (`Q-04`) |

---

## 4. Verification & Measurements

All 9 automated suites passed on the final `KF-QUALITY-002A` build (`Node 26.13.1`, `npm 11.20.0`, `ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11)`):

| Check | Result | Notes |
| :--- | :--- | :--- |
| `npm run typecheck` | **PASS** | `0` errors |
| `npm run build` | **PASS** | `1.75 s` |
| `npm run verify:assets` | **PASS (`102/102`)** | All production GLBs, textures, photos, and audio WAVs byte-identical (`runtimeBytes: 7,702,606`, `audioBytes: 341,600`) |
| `npm run verify:browser` | **PASS** | 5 viewports (`1440/768/440/390/320 px`), `0` overflow, `0` initial WebGL/audio requests |
| `npm run verify:runtime` | **PASS (`18/18`)** | Production lifecycle, lease handoff, abort, context loss, Balanced DPR `1.25` |
| `npm run verify:runtime -- --strict` | **PASS (`17/17`)** | React development StrictMode |
| `npm run verify:mechanics` | **PASS (`60/60`)** | Exterior `57` draws / `407,544` tris (`+1` draw / `+2` tris for fullscreen cyclorama background texture, `≤ 65` ceiling); Exploded `102` draws / `712,533` tris (`≤ 120` ceiling); flat `[58, 6, 12]` across 4 remount cycles; `0` idle frames over `3.5 s` |
| `npm run verify:kf005` | **PASS (`33/33`)** | Zero Switch Lab / Anatomy / Audio regression |
| `npm run verify:kf006a` | **PASS (`26/26`)** | All Build Studio finishes, keycap sets, Esc accents, legends, plates, switches, `0` console errors |

### Bundle Sizes (Gzip Level 9)
- **Entry JS (`index-Glpe6vdi.js`):** `89,940 B` (`0 B` delta vs. checkpoint `7cc85d0`, `≤ 90,000 B` **PASS**)
- **CSS (`index-BwqCnQOE.css`):** `13,616 B` (`0 B` delta)
- **Lazy native runtime (`viewportAdapter-BJwYQNve.js`):** `190,591 B` (`+1,122 B` vs. `189,469 B`, `≤ 220,000 B` **PASS**)
- **Lazy `buildConfigRuntime`:** `1,634 B` (`+4 B`)
- **Total `dist`:** `12,918,763 B`

### Open Release Gates (Deferred to KF-007)
Mobile emulation on desktop does **not** prove physical phone performance. The following release gates remain explicitly open for `KF-007`:
- Node 22.x lock parity check.
- Clean isolated GPU frame execution timing (RTX 4060).
- Physical mobile device testing (thermal/frame pacing at `DPR 1.25` Balanced).
- Integrated-GPU laptop testing.

---

## 5. Visual Evidence Contact Sheets

High-resolution before/after and Cycles-reference contact sheets are saved in ignored `.tmp/quality-002a/`:
1. `.tmp/quality-002a/contact-sheet-1-lighting-materials.png` — Forest, Obsidian, Carbon, Titanium (Before vs. After vs. Cycles `A03`/`B01`/`B02`/`B03`)
2. `.tmp/quality-002a/contact-sheet-2-legends-porcelain.png` — Porcelain overview, Two-Tone Slate overview, Dark-on-light close-up, Default Charcoal close-up (Before vs. After)
3. `.tmp/quality-002a/contact-sheet-3-anatomy-rear.png` — Exploded Anatomy vs. `A05`, Brass weight focus vs. `A07b`, Rear preset vs. `A08` (Before vs. After)
4. `.tmp/quality-002a/contact-sheet-4-mobile-quality.png` — Mobile `390×844 @ 2×` contact shadow Before/After, DPR `1.0` vs. `1.25` (selected) vs. `1.5` A/B, Mobile Rear, `320 px` & `440 px` checks

---

## 6. Handoff to `KF-QUALITY-002B`

With real-time rendering fidelity established, the next quality milestone (`KF-QUALITY-002B`) owns the editorial, spatial UX, and motion refinements identified in `KF-QUALITY-001`:
- **Build Studio & Switch Lab UI refinement (`Q-01`, `Q-05`, `Q-07`):** Simplify Build Studio inspector controls into a calmer industrial product configurator; resolve Switch Lab spatial coupling between actuation controls, force curve, and 3D switch viewport.
- **Editorial typography, rhythm & photography curation (`Q-08`, `Q-10`, `Q-12`):** Refine Hero/Bento/Header hierarchy, whitespace, and Closing Statement polish without expanding features.
- **Interaction & motion feel:** Orbit damping refinement, restrained scroll/transition choreography, and `prefers-reduced-motion` parity.
