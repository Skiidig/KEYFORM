# KEYFORM — KF-ART-002B: Art-Directed Hero & Closing Photography Integration

## 1. Scope & Frozen Foundations

KF-ART-002B integrates the approved **KF-ART-002A** art-directed photography derivatives into the production visitor page on `integration/kf004b-production`, continuing from the KF-QUALITY-002B editorial baseline. All 102 previously verified production assets (GLBs, textures, KF-003B AVIF/WebP photography, CC0 WAV audio) remain byte-identical; 18 new derivatives (9 AVIF + 9 WebP) are versioned under `public/media/kf-art-002a/` with SHA-256 entries in `tests/production-asset-inventory.json` (120/120 verified total).

- **A01 desktop hero:** unchanged (`/media/kf003b/`, 16:9, `>= 768 px`).
- **H02 mobile hero (new):** 16:10.6 art-directed mobile hero replacing the retired square `A02` crop on `< 768 px`, with 800/1280/1600 w variants and a high-priority `imagesrcset` preload in `index.html`.
- **C02 desktop closing (new):** 64:35 encoder macro (`1280/1600/2560 w`) rendered as a full-bleed desktop backdrop behind the closing copy, fading into `#050606` via a bottom gradient.
- **C02Mobile closing (new):** 76:85 portrait macro (`800/1200/1520 w`) beneath the copy on `< 1024 px`.

## 2. Implementation

### 2.1 Sections & styles
- **`src/components/sections/HeroSection.tsx` / `src/components/ui/ResponsiveImage.tsx`:** `ArtDirectedHeroPicture` now carries `desktopShotId="A01"` / `mobileShotId="H02"` with a tightened alt string; the single-`<picture>` art-direction contract (one eager hero download per viewport) is preserved.
- **`src/components/sections/ClosingStatement.tsx`:** replaced the boxed `A08` `ResponsiveImage` with an explicit four-`<source>` `<picture>` (desktop C02 / mobile C02Mobile, AVIF + WebP) using `buildSrcSet`, lazy-loaded and async-decoded; caption replaced by the image's own editorial framing; lead copy references the diamond-knurled encoder to match the new macro subject.
- **`src/styles/components.css`:** closing section restyled as a full-bleed After Hours finale (`#050606` ground, `76/85` mobile aspect, desktop absolutely-positioned media with `pointer-events: none` and a `transparent → #050606` fade at 73–86% height, footer/copy raised to `z-index: 2`); footer colophon link color lifted to `#d1d5cd` for contrast on the new ground.

### 2.2 Review corrections (this integration pass)
- **Restored the original initial-loading contract.** An earlier working-tree change wrapped `ClosingStatement` in `React.lazy`. Because the section renders eagerly on the main view, the chunk was still fetched during initial load — moving eagerly-requested code into another chunk without reducing transfer (honest aggregate: `90,858 B` gzip-9, over budget) and requiring the smoke test's "only the entry script" assertion to be relaxed. The lazy split was reverted (`src/App.tsx` renders `ClosingStatement` directly) and the strict single-entry-script network assertion restored in `tests/scripts/smoke-production.mjs`, keeping the new negative check that the obsolete `A02-mobile-hero` is never requested.
- **Recovered real bytes instead of weakening the budget.** The budget overage came from shipping never-read documentation fields (`placement`, `materialConfig`, `aspectRatio`) in `src/assets/kf003bManifest.ts`. These are removed from the shipped registry (the external `D:\Assets\KEYFORM\kf003b\validation\production-asset-manifest.json` remains the descriptive source of truth); runtime consumers (`variants`, `fallbackSrc`, `intrinsicWidth/Height`, `defaultAlt`, `shotId`) are untouched. No test thresholds were changed to pass.
- **Fixed a pre-existing KF-005 polling race (test robustness only).** The `ui-switch` bottom-out assertion failed at HEAD `265334b` (confirmed on an isolated worktree build, independent of this working tree): the readout rounds travel to one decimal, so `4.0 / 4.0 mm` displays while the eased travel bar is still ~1% from settling and the snapshot could catch `98.9%`. `tests/scripts/verify-kf005.mjs` now waits for the press to settle (`readout 4.0` **and** `barWidth 100%` **and** `aria-pressed true`) before snapshotting; the assertion itself is unchanged.

## 3. Verification (RTX 4060, Node 26.13.1, gzip level 9)

All nine suites pass on the final build:

| Suite | Result |
| :--- | :--- |
| `typecheck` | 0 errors |
| `build` | clean (Vite 6) |
| `verify:assets` | **120/120** assets (102 untouched + 18 KF-ART-002A), SHA-256/MIME/404, all runtime files declared |
| `verify:browser` | 5 viewports (`1440/768/440/390/320`), 0 overflow, 0 initial 3D/audio, exactly **1 initial script**, correct A01/H02 selection, H02 WebP fallback |
| `verify:runtime` | **18/18** production lifecycle |
| `verify:runtime -- --strict` | **17/17** dev StrictMode |
| `verify:mechanics` | **60/60** (57 exterior / 102 exploded draws, flat `[58, 6, 12]` remounts, zero idle frames) |
| `verify:kf005` | **33/33** |
| `verify:kf006a` | **26/26** |

### 3.1 Bundle & transfer measurements
- **Aggregate initial JS transfer: `89,685 B` gzip-9** — a single entry script (`index-4T4X9Qds.js`, 299,471 B raw), verified by network assertion at all five viewports (`≤ 90,000 B` **PASS**; −207 B vs. the 89,892 B KF-QUALITY-002B entry).
- CSS `14,332 B` gzip-9; lazy native runtime `viewportAdapter` `190,592 B` (`≤ 220,000 B` PASS); lazy `buildConfigRuntime` `1,636 B`, `SwitchLabInteractive` `2,873 B`, `SwitchLabAudioPanel` `4,182 B`, `DesignSystemPreview` `5,784 B`, `digest` `209 B`.
- Cold initial image wire transfer (CDP): desktop 1440 hero `39,194 B` / total `115,275 B`; mobile 390 hero `23,621 B` / total `73,139 B` — consistent with the P0 baseline while upgrading both hero crops.

## 4. Evidence & Limitations

- Visual evidence (unchanged by the review corrections, which alter only load structure and manifest metadata): `.tmp/art-002b/contact-sheet-hero.png`, `contact-sheet-closing.png`, plus per-viewport before/after captures and profiles in the same directory.
- The retired square `A02-mobile-hero` derivatives remain in `public/media/kf003b/` (inventory-verified) but are no longer referenced by the page or preloads; removal is a future cleanup decision, not part of this phase.
- Open KF-007 gates are unchanged: Node 22.x lock parity, clean isolated RTX 4060 timing, physical mobile and iGPU validation, Lighthouse/Core Web Vitals, and accessibility audit.
- No merge, push, or deployment occurred; the production preview serves `dist/` at `http://127.0.0.1:4185/`.
