# KEYFORM — Phase Handoff

## KF-004B-P0 production foundation (Ready for Review)

The owner approved production promotion starting with KF-004B, superseding the frontend lab's KF-006 gate. KF-004A-R2 at `D:\Assets\KEYFORM\frontend-lab\app` is the canonical visitor application. KF-003C-B3 at `D:\Assets\KEYFORM\kf003c-b3` is the approved runtime baseline. External sources and experimental labs were read-only. Sample-based audio is optional and excluded from P0.

- **Repository.** Work is on `integration/kf004b-production` from `5977b7ebbd57c030786614767534097a961b4e75`. The existing KF-003C-A handoff entry is preserved below. Main remains at the starting commit. No merge, push, or deployment is authorized.
- **Frontend.** All 30 `src/` files, `index.html`, `tsconfig.json`, and the favicon match the approved frontend by byte comparison. The Vite port and npm run commands were adapted for production. The React, TypeScript, Vite, and Fontsource package resolutions are preserved. One npm v3 lock adds Ajv 8.20.0 and Ajv Formats 3.0.1 for development-only validation. Native Three.js r180 and thin React adapters start in P1.
- **Portable assets.** The 37 AVIF (1,495,250 B) and 37 WebP (1,854,506 B) files match the approved photography checksums. Recomputed all 12 B3 inventory hashes and verified equality with B2.2. The four published models and two mask PNGs are byte-identical to B3. The standalone encoder normal was verified against the embedded exterior copy. [Full SHA-256 inventory](../tests/production-asset-inventory.json).
- **Delivery.** The [production manifest](../public/assets/kf01/kf01-kf004b-b3.1/manifest.json) and [schema](../tests/kf01-production-manifest.schema.json) v1.2.0 use manifest-relative URLs. The delivery version and atlas references were updated and mapping hashes recomputed. No local lab routes, legacy model fallback, or external environment texture is needed. The plain static server returned 83 checked assets with the expected bytes, SHA-256 and MIME types, and returned a plain 404 for a deliberately missing GLB.
- **Build.** Clean `npm ci`, typecheck, and build passed with Node 26.13.1 and npm 11.20.0. Node 22.x with compatible npm ≥10.5.1 remains the preferred environment. Verify that environment with the same lock before release. Total `dist` size is 11,787,860 B, including a 7,702,606 B runtime asset package. Initial JS is 88,476 B gzip, CSS is 12,415 B, and the lazy design-system chunk is 5,784 B (Node zlib level 9 for all three).
- **Browser.** Edge smoke passed at 1440, 768, 440, 390, and 320 CSS pixels. It confirmed zero overflow, mobile framing, correctly selected A01/A02 hero photography, WebP when AVIF sources were disabled for the test, seven sections, and 44 px hero targets. The browser verified the four enclosure images, preview match labels, default `KF01-FOR-CHR-MTC-L45-ALU`, Switch Lab Apply through Build Studio and Closing, clipboard contents, reset, keyboard skip navigation, reduced motion, three static viewport stations, and the lazy design-system route. It recorded zero unexpected console or network errors and no initial WebGL or audio asset requests. Cold CDP initial image wire transfer was 115,175 B at desktop (39,169 B hero) and 71,306 B at 390 px (21,838 B hero). The desktop viewport PNG hash matches the saved R2 capture. The mobile viewport capture was compared visually and preserves the approved framing and content. Captures and network traces are local in `.tmp/p0-evidence/`.
- **P1 entry.** Owner accepts P0, then recheck the static build and serve it at `http://127.0.0.1:4185/`. Use the [P1 integration handoff](KF-004B-P1.md) for the exact manifest URL, resolver, studio profiles, B3 legend fixes, and renderer ownership. B3's 47/47 regression result and approximately 56/101 exterior/exploded draw counts are inherited lab evidence. Clean GPU timing, physical mobile and iGPU tests, lazy runtime size, interaction timing, and context-loss/cancellation gates are still open. [Current engineering and release gates](ROADMAP.md).


## KF-003C-A production asset contract & baseline GLB export (Ready for Review)

**Status:** `KEYFORM KF-003C-A — BASELINE WEB ASSETS READY FOR REVIEW` (local preview at `http://127.0.0.1:4175/`).  
All source masters (`kf01_kf003a_r3.blend` SHA-256 `23033d09a8f7f994a7a36bc62fa25ae794c8157efc4a693eae2e7af6679e7e3e`, `kf01_kf003b_prod.blend` SHA-256 `6c1d3c1440c29e96252f01a20474df44dd60721263bbf40095cc39e433b4e93e`, `reference/kf01_layout.json` SHA-256 `7fb16d39abefc25ba54e43f298d84b66ca1b71e936eb3f843174098d9d04808c`), KF-003B production renders, `webgl-lab`, and `design-lab` were kept strictly read-only and verified unchanged. All experimental outputs live exclusively under `D:\Assets\KEYFORM\kf003c\`.

| Deliverable | Path under `D:\Assets\KEYFORM\kf003c\` |
| :--- | :--- |
| Versioned asset contract & Draft 2020-12 JSON Schema (`v1.0.0`) | `manifest\kf01_asset_manifest.json` and `manifest\kf01_asset_manifest.schema.json` |
| Reproducible Blender staging & export scripts | `scripts\audit_source.py`, `export_baseline_glbs.py`, `build_manifest.py` |
| Reproducible staging Blender file | `staging\kf01_baseline_staging.blend` |
| Baseline Exterior GLB (`GRP_01`, `GRP_02`, `GRP_09`; `12.22 MB`, `660,487` tris) | `assets\kf01_exterior_baseline.glb` |
| Baseline Internal GLB (`GRP_03`–`GRP_08`; `3.81 MB`, `385,981` tris) | `assets\kf01_internal_baseline.glb` |
| Baseline Standalone Hero Switch GLB (`HERO_MX_Root`; `1.01 MB`, `29,752` tris) | `assets\kf01_hero_switch_baseline.glb` |
| Source geometry, partition & PBR audit | `docs\SOURCE_AND_EXPORT_AUDIT.md` and `audit\export_report.json` |
| Official Khronos `gltf-validator` + Schema + Shuffled-order report | `validation\gltf-validation.json` |
| Isolated Vite + React 19 + TS + Three.js + R3F inspection viewer (`:4175`) | `viewer\` (`http://127.0.0.1:4175/` & `/bench`) |
| Automated Edge runtime verification & 8 review screenshots | `validation\runtime-verification.json` and `screenshots\01`–`08` |
| Baseline performance report & machine-readable benchmarks | `docs\BASELINE_PERFORMANCE_REPORT.md` and `benchmarks\baseline-benchmark.json` |
| Prioritized KF-003C-B optimization plan | `docs\KF003C_B_OPTIMIZATION_PLAN.md` |

- **Partition & geometry fidelity:** Strict assembly-group boundary partition (`Exterior = GRP_01 + GRP_02 + GRP_09`; `Internal = GRP_03..GRP_08`) sharing identical `KF01_Root` → `KF01_TiltPivot_6p5deg` meter-scale glTF Y-up coordinate frames (converted once via `io_scene_gltf2 5.3.43` `export_yup=True`, `rootScale = [1, 1, 1]`). Zero mesh overlap across partitions; exact combined parity with approved R3 (`949` mesh nodes, `1,046,468` evaluated triangles, `327.000 × 50.489 × 138.000 mm` bounds, `Y_min = 0.000`, `6.5°` tilt, `81/81` Alternative A keys, `1` encoder, `9/9` assembly groups). Standalone Hero Switch (`29,752` tris, `16` mesh parts) remains completely separate from the 81 installed switches.
- **Definitive PBR & Charcoal PBT resolution:** Inspected `kf01_kf003b_prod.blend` directly. `MAT_Keycap_Alpha` and `MAT_Keycap_Mod` are identical procedural Cycles shaders oscillating between `#171C1B` and `#1C2220` via `21.5 kHz` noise; their exact linear-space midpoint (`[0.010090, 0.013804, 0.012702]`) encodes to **`#1A1F1E`** sRGB (definitive baseline default across all 81 keycaps including `Esc`, superseding WebLab's `#1C2120` placeholder). Default Forest anodized enclosure (`MAT_Case_Anodized`, ramp `#2E463A–#3F584A`) has linear midpoint **`#375043`** (`metallic 0.88`, `roughness 0.365`, `clearcoat 0.08`). All procedural Cycles micro-relief, Voronoi foams, and brushed anisotropy are cataloged as deferred texture baking work for KF-003C-B (no exact Cycles parity claimed).
- **Validation results (all passed):**
  - Khronos `gltf-validator 2.0.0-dev.3.10`: **`0` errors, `0` warnings, `0` hints** across all 3 GLBs; Draft 2020-12 JSON Schema valid (`0` errors).
  - Shuffled-node-order semantic resolution: `81/81` exterior keycaps, `81/81` internal switch stems, `9/9` groups, and encoder knob/input/shaft resolved strictly via `extras` (independent of GLB child ordering).
  - Live Edge browser suite (`verify_viewer.mjs`): `81/81` overhead raycast picks + `8/8` real DOM pointer clicks (outline helper excluded), strict enclosure material isolation (`#375043 / #a1abb3 / #191b1e / #373d43` with `0` keycap drift from `#1a1f1e`), verified `-4.0 mm` cap + stem + spring press on `Esc/Enter/Space/Up`, verified `+36°` / `0.5 mm` encoder actuation, exact piecewise-linear exploded frames `1/12/24/26/51/76/101` (including staged `GRP_07_USB_Daughterboard` withdrawal frames `12→24` and `KF01_Gasket_TravelWithPlate` `+22 mm` offset), `0` idle frames over `3,508 ms`, 404 failure banner handled cleanly, flat GPU resource counts across 4 remount cycles (`226G/3T/10P` full-loaded cleanly disposed → flat `166G/2T/3P` across cycles 1–4), and verified zero-canvas WebGL-disabled static fallback.
- **Measured baseline bottlenecks (RTX 4060 / Edge D3D11, `1280×720 @ DPR 1`, GPU timings flagged `PROVISIONAL` due to concurrent Blender/Wallpaper Engine/Steam processes):**
  - `exterior_assembled`: `12.22 MB`, `319` draw calls, `660,487` tris, CPU submit `1.30 / 2.20 ms` (mean/p95), GPU sync `1.13 ms`.
  - `combined_assembled`: `16.03 MB`, **`1,811` draw calls**, **`2,056,216` tris**, CPU submit `5.73 / 9.50 ms`, GPU sync `4.82 ms`. *Key discovery:* `KHR_materials_transmission = 0.18` on installed `MAT_Switch_Housing` triggers Three.js's full-scene opaque transmission pre-pass, doubling Combined draw calls and rendered triangles (`950 → 1,811`, `1.046M → 2.056M`)!
  - `combined_exploded`: `16.03 MB`, `1,807` draw calls, `2,054,496` tris, CPU submit `5.32 / 6.40 ms`, GPU sync `4.89 ms`.
  - `hero_switch`: `1.01 MB`, `29` draw calls (`16` opaque on Tactile 58), `51,416` tris (`29,752` opaque), CPU submit `0.23 / 0.40 ms`, GPU sync `0.24 ms`.
  - Desktop `390×844 @ DPR 2` viewport proxy recorded separately and explicitly marked as **not** real mobile hardware performance.
- **Next phase (`KF-003C-B` entry gate):** Await owner review and approval of the baseline web assets, manifest contract, and prioritized optimization plan (`docs\KF003C_B_OPTIMIZATION_PLAN.md`: removing installed switch transmission pass, legend UV atlas, GPU instancing, hidden spring removal, encoder knurl normal/AO bake, component-specific retopology, Meshopt + KTX2 compression, custom Cycles PMREM + AgX calibration, and mobile tiers) before modifying asset geometry or integrating into production frontend.

## KF-003B geometry freeze & production assets (Complete)

Approved **KF-003A-R3** geometry remains frozen on `main` at `4af6fdd` and verified untouched in `D:\Assets\KEYFORM\blender\kf01_kf003a_r3.blend` + `backups\kf003a-r3-approved\` (SHA-256 `23033d09a8f7f994a7a36bc62fa25ae794c8157efc4a693eae2e7af6679e7e3e`). Following owner approval of the lookdev draft contact sheet, **KF-003B** applied the ~7% zoom-out adjustment to `A02` mobile hero framing, executed the full **18-shot Cycles OptiX production batch** (15 core shots + 3 Build Studio fallback enclosure colorways: Obsidian, Carbon, Titanium, all with uniform Charcoal PBT across all 81 keycaps including `Esc`), visually verified all 18 PNG masters, encoded **74 responsive AVIF + WebP derivatives** with zero budget exceptions, and recorded the `KF-003C` WebGL handoff architecture.

| Deliverable | Path under `D:\Assets\KEYFORM\` |
| --- | --- |
| Frozen approved R3 geometry master *(verified untouched)* | `blender\kf01_kf003a_r3.blend` and `backups\kf003a-r3-approved\` |
| Versioned KF-003B production lookdev master | `blender\kf01_kf003b_prod.blend` |
| Production scripts & README | `kf003b\README.md` and `kf003b\scripts\` |
| 18 full-resolution PNG masters + 18-shot contact sheet | `renders\cycles-raw\kf003b-prod\` (`kf003b-production-contact-sheet.png`) |
| 74 responsive web derivatives (`37` AVIF + `37` WebP) | `renders\web-export\kf003b\avif\` and `renders\web-export\kf003b\webp\` |
| Asset manifest (dimensions, sizes, placements, configs, SHA-256) | `kf003b\validation\production-asset-manifest.json` |
| Production render telemetry & package integrity (`108` files) | `kf003b\validation\production-render-telemetry.json` and `kf003b\validation\SHA256SUMS.txt` |

- **Unified Charcoal PBT color policy:** Verified programmatically across all 81 keycaps (including `Esc`, modifiers, and mounts) with consistent subtle off-white legends (`MAT_Legend_Light`) across all default renders and all four enclosure colorways (Forest, Obsidian, Carbon, Titanium). `MAT_Keycap_Accent` remains stored (`use_fake_user=True`) strictly as an optional future Build Studio slot.
- **Final minor adjustment (`A02`):** Zoomed `PROD_Cam_A02_MobileHero` out by `7.0%` (`pos=(194.5, -398.3, 317.4)`), verified clean horizontal breathing room on both edges with the complete keyboard, encoder, and separated R3 arrows visible.
- **18-shot Cycles OptiX production batch (RTX 4060 8 GB, Blender 5.3.0):**
  - Core `15` shots: `A01` (`2880×1620`), `A02` (`1600×1600`), `A03` (`2400×1600` Forest reference), `A04a` (`2000×1500` macro), `A04b` (`2400×1350` `6.5°` side profile), `A04c` (`2000×1500` rear USB-C), `A05` (`2000×1800` 9-group exploded stack), `A06a/b/c` (`2000×2000` Linear 45 / Tactile 58 / Silent 50 dark Switch Lab), `A07a–d` (`1920×1200` Aluminium/Knurl, unobstructed Brushed Brass Weight, Charcoal PBT, Acoustic Stack), `A08` (`2400×1600` closing rear silhouette).
  - Build Studio static fallbacks (`3` shots, pixel-aligned to `A03` camera/lighting with uniform Charcoal PBT): `B01` Obsidian, `B02` Carbon, `B03` Titanium (`2400×1600` each).
  - **Actual telemetry:** `167.35 s` combined pure render (`194.73 s` batch wall time), peak board-wide VRAM `5,598 MiB / 8,188 MiB` (`A06b`). *Concurrent GPU flag:* Board-wide VRAM and per-frame wall times include concurrent desktop apps, an interactive Blender window, and `DeepSeek Harness.exe` (`KF-WEBLAB-001` in isolated `webgl-lab`); baseline VRAM was `3,422–4,047 MiB` vs. `~3,049–3,337 MiB` during isolated benchmarks.
- **Responsive web export & QA:** Encoded `37` AVIF (`Q74–76`, min PSNR `41.98 dB`) and `37` WebP (`Q86–88`, min PSNR `41.68 dB`) derivatives via Pillow `13.0.0`. All 18 primary web variants beat `ARCHITECTURE.md` targets with **zero budget exceptions** (`A01` `1600w` `38.1 KB` / `2560w` `68.0 KB` vs. `180 KB` target; `A02` `800w` `21.1 KB` / `1280w` `37.0 KB` vs. `90 KB` target). Visual inspection confirmed crisp legends, clean silhouettes, zero clipping, zero shading artifacts, and accurate materials across all 18 masters and representative web derivatives.
- **Next phase (`KF-003C`):** Do not start `KF-003C` real-time WebGL GLB staging/optimization or `KF-004` frontend integration until owner approval. See [ASSET_PIPELINE.md](ASSET_PIPELINE.md) §6.2 for the documented `KF-003C` partitioned WebGL 2 handoff architecture.

## KF-003A-R3 canonical layout integration (Approved — Geometry Freeze)

The owner has approved **KF-003A-R3** (**KF-LAYOUT-001 Alternative A**) as the canonical digital product geometry. Implements Alternative A on the clean flat-deck KF-003A-R1 top enclosure baseline, removing the R2 raised local shoulders and forming physically independent apertures for the main typing block, navigation column (`Delete`, `PgUp`, `PgDn`, `End`), inverted-T arrow cluster (`Up`, `Left`, `Down`, `Right`), and four function groups. The 81-switch architecture, encoder datum `(138.1125, 50.00625) mm`, `327 × 138 mm` desk footprint, `6.5°` typing incline, keycap unit widths, nine assembly groups, approved KF-003A procedural materials, and both studio rigs carry over unchanged.

| Deliverable | Path under `D:\Assets\KEYFORM\` |
| --- | --- |
| Approved R3 Blender master | `blender\kf01_kf003a_r3.blend` |
| Verified approved R3 recovery package | `backups\kf003a-r3-approved\` |
| Updated canonical layout candidate (Alternative A) | `reference\kf01_layout.json` and `kf003a-r3\reference\kf01_layout.json` |
| Verified pre-R3 recovery package (R1/R2 masters, baseline manifest, scripts) | `backups\kf003a-r2-before-r3\` |
| Reproduction commands and source | `kf003a-r3\README.md` and `kf003a-r3\scripts\` |
| Six review outputs (incl. matched R2 vs R3 comparison) | `renders\kf003a-r3\` |
| Integration audit, before/after dimensions, 9-depth clearances & lower-stack fit | `kf003a-r3\validation\r3-integration.json` |
| Unmodified regression suite & render telemetry | `kf003a-r3\validation\geometry.json`, `clearance.json`, and `render-performance.json` |
| Package integrity | `kf003a-r3\validation\SHA256SUMS.txt` |

- **Relocated centers:** Only the eight Alternative A switch centers moved: Navigation (`Delete`, `PgUp`, `PgDn`, `End`) by `(+1.45, 0.00) mm` to `X = 146.70625 mm`, and Arrows (`Up`, `Left`, `Down`, `Right`) by `(-1.45, -2.85) mm` (`Up` at `(124.75625, -33.80625) mm`, `Left/Down/Right` at `Y = -52.85625 mm`). Every key and the encoder match `study-coordinates.csv` to `< 1e-6 mm`.
- **Integrated top frame:** Flat R1 deck (`Z = 0.000 mm`, roof underside `-1.450 mm`, `0.750 mm` above plate top) with seven independent key apertures plus unchanged `Ø 8.20 mm` encoder bore (`0.72 mm` envelope offset, `R0.80 mm` internal corners, `0.12 mm` bevel modifier). Minimum independent separator measures `2.46 mm` nominal (`2.22 mm` study flat width after two `0.12 mm` edge breaks; `2.32 mm` evaluated flat width on the beveled 3D mesh) at Enter/Up, RShift/Left, and End/Right; Up/End measures `2.51 mm` nominal (`2.27 mm` study flat / `2.36 mm` evaluated flat); RShift/Up and RCtrl/Left measure `2.92 mm` nominal (`2.68 mm` study flat / `2.78 mm` evaluated flat); typing-to-nav measures `5.82 mm` nominal. Evaluated top frame is one connected manifold with zero non-manifold edges. Nominal cutout area shrank from `34,205.20` (R1) to `34,148.96 mm²`.
- **Dependent lower components (3D-verified):**
  - **Switch plate (`KF01_Plate_Main`):** `+1.71 mm` local front extension (`Y = -60.15` to `-61.86 mm`, angled transition `X = 93.5 → 95.5 mm` to `+156.6 mm`), yielding `2.004 mm` front stock land ahead of arrow cutouts and `2.894 mm` right land outside navigation cutouts; Front Tab #6 extends to `Y = -64.65 mm`.
  - **PCB (`KF01_PCB_Main`):** `+2.50 mm` local front extension (`Y = -58.25` to `-60.75 mm`, `+0.04 mm` beyond the `2.46 mm` study minimum), yielding `1.039 mm` FR4 margin beyond arrow hot-swap socket bodies and `2.014 mm` beyond solder lands; all 81 pin groups and 4 stabilizer mounts re-drilled.
  - **Acoustic layers (`KF01_Foam_PoronPlate`, `KF01_Foam_IXPE`):** `+2.55 mm` local front extensions (`Y = -60.85` and `-60.70 mm`), preserving `0.819 mm` and `0.809 mm` front borders and re-cut for all 81 switches.
  - **Front Gasket #6 & Shelf #6 (`KF01_Gasket_Front_6`, `KF01_Gasket_Shelf_-1_6`):** Retains the symmetric `X = +129 mm` station while avoiding a full-press `Down` cap-skirt collision by introducing a compact `2.78 mm`-deep arrow-station silicone sock (`MESH_Gasket_Silicone_ArrowFront`, `Y ∈ [-65.38, -62.60]`, `2.09 mm` tab slot, unchanged `0.75 mm` top/bottom cushions and `0.69 mm` front end-wall) seated on a `3.02 mm`-deep lower shelf (`Y ∈ [-65.52, -62.50]`). Gasket #6 tucks `0.024 mm` beneath the arrow bezel wall, clearing the `Down` keycap skirt by `0.785 mm` at full `4.0 mm` press, `Down` switch lid by `1.969 mm`, TopFrame cavity by `0.295 mm`, BottomChassis cavity by `0.668 mm`, and extended PCB by `1.750 mm` (to shelf rear). The outer bottom chassis (`327 × 138 mm`, `6.5°`) is unchanged.
- **Mechanical regression:** All 14 unmodified `validate_master.py` checks passed. The unmodified `sweep_clearance.py` triangle sweep (63 assembly frames + 9 keypress depths) found `0` unclassified intersections and `0` keypress intersections above `0.06 mm`, matching all `164` intended interfaces. All 81 keycaps retain `≥ 0.72 mm` frame clearance (`0.720 mm` across all audited right-cluster keys, `0.720 mm` global min), `≥ 0.440 mm` skirt-to-plate clearance, and `≥ 0.785 mm` skirt-to-gasket clearance across `0–4 mm` travel. Straight-up cap extraction maintains `2.24 mm` rest skirt height above deck; encoder retains `0.60 mm` full-push clearance and `4.85 mm` swept knob-to-Delete clearance.
- **Render telemetry:** Six review outputs rendered on RTX 4060 with Blender 5.3.0 OptiX (`22.93 s` combined render time across the six unique rendered panels; `03-r2-vs-r3-right-cluster-comparison.png` reuses `02-right-cluster-closeup.png` and pairs it with `kf01_kf003a_r2.blend` under identical `R2_Camera_RightCluster`, lighting, and sampling settings). Board-wide GPU peak was `4,161 MiB`.
- **Remaining limitations:** Validation covers nominal modeled geometry only. Physical CNC tolerances, anodization build-up, gasket compression/durometer behavior (particularly the shallower `2.78 mm` Front Gasket #6 sock versus `4.18 mm` standard socks), plate/PCB deflection, PCB trace/component clearance near `-60.75 mm`, and angled/rocked keycap puller insertion remain untested. Owner geometry freeze review is required before KF-003B.

## KF-003A-R2 right cluster review

The owner's physical keyboard photo guided the tighter frame around the right-hand keys. R2 builds on the R1 master with locally raised chamfered shoulders and aperture returns. The key centers, labels, switch plate, encoder, case footprint, materials, and studio lighting carry over.

| Deliverable | Path under `D:\Assets\KEYFORM\` |
| --- | --- |
| R2 Blender master | `blender\kf01_kf003a_r2.blend` |
| Verified R1 recovery package | `backups\kf003a-r1-before-r2\` |
| Reproduction commands and source | `kf003a-r2\README.md` and `kf003a-r2\scripts\` |
| Four review images | `renders\kf003a-r2\` |
| Per-key distances at nine depths and before/after sections | `kf003a-r2\validation\right-cluster.json` |
| Original validation suite and render telemetry | `kf003a-r2\validation\geometry.json`, `clearance.json`, and `render-performance.json` |
| Package integrity | `kf003a-r2\validation\SHA256SUMS.txt` |

- The shoulder rises up to `0.904 mm` above the original deck. Returns reach `0.91 mm` into rounded cap corner gaps at the outer navigation wall and arrow front. The end of the navigation separator reaches up to `0.84 mm` farther into its corner relief. The evaluated top frame is one connected manifold.
- The sampled rest gap at Delete, PgUp, PgDn, End, Left, Down, and Right fell from `2.48 mm` to `1.64 mm`. Up and RShift have `2.25 mm` and `2.16 mm` at rest respectively. Each checked right-side key retains `0.72 mm` at full 4 mm press.
- The `1.05 mm` Up/End and End/Right throats retain their shared opening. Two `0.72 mm` working clearances already exceed the available width there. The wider RShift-to-Up pocket stays connected at the stepped row transitions for the same reason.
- The encoder retains `0.60 mm` to the deck at full push. The raised lands stop before the knob's swept envelope. The underside of the roof retains `0.75 mm` above the plate. The canonical right navigation column uses Delete, PgUp, PgDn, and End.
- All 14 inherited checks passed, including the original `327 × 138 mm` footprint and `6.5°` angle checks. The triangle sweep found zero unintended intersections above `0.06 mm` across 63 assembly samples and nine press depths. The 164 intended interfaces match R1.
- The four review images used `20.59 s` of total Cycles rendering on the RTX 4060 with OptiX. The sampled board-wide peak was `4,276 MiB`. The comparison reuses the standalone R2 close-up and pairs it with the R1 frame under identical camera, lighting, and sampling settings.

The review concerns modeled geometry. Cap-puller angles, physical flex, and manufacturing tolerances remain untested. Git is on `main` at `ac4cbaf`, with the documentation edits unstaged. Right-cluster approval is the entry requirement for KF-003B.

## KF-003A-R1 top frame baseline

The owner provisionally approved KF-003A finishes, lighting, caps, encoder knurling, and the standalone hero switch. The owner’s physical keyboard photo guided the integrated navigation strip, stepped arrow boundary, and separated function groups. KEYFORM cap envelopes supplied the dimensions.

| Deliverable | Path under `D:\Assets\KEYFORM\` |
| --- | --- |
| Editable R1 master | `blender\kf01_kf003a_r1.blend` |
| Before-R1 recovery package | `backups\kf003a-before-r1\` |
| Reproduction instructions and source | `kf003a-r1\README.md` and `kf003a-r1\scripts\` |
| Five review files with matched top and right-side comparisons | `renders\kf003a-r1\` |
| Cap envelopes, aperture geometry, and before/after dimensions | `kf003a-r1\validation\top-frame.json` |
| Mechanical and render checks | `kf003a-r1\validation\geometry.json`, `clearance.json`, and `render-performance.json` |
| Package integrity | `kf003a-r1\validation\SHA256SUMS.txt` |

- A single Forest aluminium frame now includes a `4.37 mm` navigation web and a `4.37 mm` front step beside the arrow cluster. Esc, F1–F4, F5–F8, and F9–F12 have individual openings. The bridges between them measure `9.13 mm`, `4.37 mm`, and `4.37 mm` before edge breaks.
- The nominal open area shrank from `36,102` to `34,205 mm²`. The retained `1.05 mm` transitions at Up and End leave less width than the required `0.72 mm` clearance on each side, so those locations share a continuous pocket. The resulting frame is one connected manifold.
- The minimum sampled cap-to-case distance across 81 caps changed from `2.59 to 2.48 mm` at rest and from `1.01 to 0.72 mm` at full press. The cap skirt sits `2.24 mm` above the deck for straight upward removal. The new roof underside measures `0.75 mm` above the plate top at the separator probes. The encoder has `0.60 mm` above the deck at full push, and its `8.20 mm` bore, detents, and travel carry over.
- All 14 existing geometry checks passed. The sweep found zero unintended intersections over `0.06 mm` across 63 assembly samples and nine press depths. All 164 intended interface pairs match the baseline. The sampled model and the photo comparison support an owner design review. Angled cap pullers, material flex, and physical machining tolerances remain untested.
- The five files contain seven OptiX renders including the paired panels. Blender 5.3.0 rendered them on the RTX 4060 in `30.82 s` of combined render time, with a measured board-wide peak of `3,965 MiB`. The comparison panels use matching cameras, lighting, materials, and scale.

Git is on `main` at `ac4cbaf`. The five documentation edits are available unstaged for owner review. Top-frame approval is the remaining entry criterion for KF-003B.

## KF-003A lookdev baseline

The approved KF-002 geometry is checkpointed on `main` in `ac4cbaf`. The KF-003A lookdev build starts from a verified copy of that master. The original eight review stills and their backup remain available for comparison. The KF-003A documentation changes are uncommitted for review.

| Deliverable | Path under `D:\Assets\KEYFORM\` |
| --- | --- |
| Editable KF-003A master | `blender\kf01_kf003a.blend` |
| Approved KF-002 recovery copy | `backups\kf002-approved\` |
| Reproduction instructions and code | `kf003a\README.md` and `kf003a\scripts\` |
| Seven review stills | `renders\kf003a\` |
| Before and after measurements | `kf003a\validation\refinement.json` |
| Geometry, assembly sweep and press clearance | `kf003a\validation\geometry.json` and `kf003a\validation\clearance.json` |
| Materials, studio profiles and render telemetry | `kf003a\validation\materials.json`, `lighting.json`, and `render-performance.json` |
| Package integrity | `kf003a\validation\SHA256SUMS.txt` |

## What changed

| Feature | KF-002 approval baseline | KF-003A candidate |
| --- | --- | --- |
| Cap installation | Skirt at 2.80 mm above deck. Full-stroke mount-to-lid margin 0.24 mm. | Hollow skirt extends 0.56 mm, reducing the visible gap to 2.24 mm. Skirt-to-plate margin at full press is 0.44 mm. Mount-to-lid margin remains 0.24 mm. A dark switch lid and satin graphite plate reduce contrast beneath the caps. |
| Cap surface | Nested crown rings with irregular triangulation across the dish. | Row-specific quad crown and softer shoulder transitions. Legends are projected to the new surface. The 81 shell instances still share 18 meshes. |
| Case and encoder | Ten outer-corner steps per quarter and a sinusoidal knurl. | Thirty-two steps per quarter, hardened bevel normals, and a regular 48-tooth crossed-groove knurl with 1.40 mm axial pitch and 0.205 mm maximum groove depth. |
| Switch macro | Shared installed switch components used for the close-up. | Standalone hero switch with a smoked lid, snap windows, retention tabs, stem runners, variable-pitch spring, and stamped copper leaves. The 81 installed switch meshes come from the approved master. |

The derivative preserves the canonical 81-key layout plus encoder, typing angle, case plan, key IDs, nine assembly groups, 4 mm cap travel, and encoder motion. The original 14 geometry checks passed. The evaluated triangle sweep found zero unclassified assembly or keypress intersections over the existing `0.06 mm` threshold in 63 assembly samples and nine downstroke depths. The 164 intended terminal and carrier screw pairs match KF-002.

## Finish and lighting decisions

- **Forest:** dark green bead-blasted aluminium with `0.36–0.43` roughness and `9 µm` bump distance. The knob uses a separate metal finish with its own face material.
- **Keycaps:** charcoal PBT uses `0.60–0.69` roughness and `8 µm` bump distance. Esc retains a warmer ivory finish.
- **Internals:** brushed brass uses `0.34–0.43` roughness, directional grain, and anisotropy. Graphite plate, green solder mask, Poron, IXPE, silicone, stainless, and USB-C retain separate materials. The hero switch combines smoke-tinted polycarbonate, ivory POM, steel, and copper.
- **After Hours:** dark neutral floor, broad cool overhead light, warm rear strip, and two soft fills. **Form / Function:** brighter neutral field with four wide studio sources. The switch scene uses the same direction scaled to macro subject size. Both keyboard rigs share the same procedural product materials.

The switch close-up and internal interfaces are visualization approximations. The clearance report samples modeled motion, and the finish values are appearance parameters. The added cap and knob detail raises the product master to about 1.04 million evaluated triangles. A real-time asset will require a separate staging scene.

Blender 5.3.0 rendered the seven `1,100–1,200 px` review stills on the RTX 4060 with OptiX denoising and adaptive sampling. Total measured render time was `28.12 s`. The sampled board-wide framebuffer peak was `3,920 MiB`.

## KF-003B entry after R3 geometry freeze review

After KF-003A-R3 geometry freeze approval, carry forward the Alternative A canonical layout and clean integrated flat deck with the provisionally approved KF-003A finishes and studio rigs. Finalize editorial framing and review knob finish coupling, the brass weight highlight, and switch cover translucency before production stills. Stage the GLB separately with baked legends and knurling, lightweight cap silhouettes, stable per-key IDs, and measured GPU instancing. The asset and draw-call budgets are in [ASSET_PIPELINE.md](ASSET_PIPELINE.md).

Space Grotesk versus Inter Tight remains a KF-004 decision. Static stills versus the shared GLB for Mechanical Anatomy remains open for KF-003B or KF-005.
