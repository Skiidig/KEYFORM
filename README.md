# KEYFORM — KF—01

**Live website:** https://keyform-lake.vercel.app

KEYFORM is a fictional independent industrial design concept and interactive product showcase for **KF—01**, a 75% ANSI CNC-machined 6063 aluminium mechanical keyboard.

> **Fictional Concept Disclosure:** KEYFORM and KF—01 are fictional industrial design concepts created for design and engineering portfolio review. Displayed imagery and 3D views are computer-rendered; no commercial availability, manufacturing, certification, or laboratory acoustic testing is implied. Verified mechanical standards (19.05 mm Cherry MX pitch, 14.0 mm plate cutout, 1.5 mm plate, 1.6 mm PCB) are distinguished from conceptual KF—01 specifications throughout the experience.

## Features

- **Static-First Editorial Experience:** Full-bleed responsive AVIF/WebP studio photography (`OR13` desktop Hero, `OR14` mobile Hero) loads immediately with zero initial WebGL or audio requests.
- **Conditional Automatic 3D with Single-Renderer Lease:** Three interactive Three.js stations (**Mechanical Anatomy**, **Switch Lab**, and **Build Studio**) share a single WebGL renderer that activates automatically after sustained eligible visibility, with manual `View in 3D` / `Close` ownership and graceful static fallbacks for reduced motion, `Save-Data`, slow connections, or low-memory devices.
- **Mechanical Anatomy:** 9-layer exploded assembly inspection with non-destructive layer focus and spherical camera transitions.
- **Switch Lab:** Interactive 3D switch cutaway/assembled inspection, pointer/keyboard actuation, synchronized force-travel curve, and opt-in CC0 Web Audio acoustic preview (loaded only after an explicit user gesture).
- **Build Studio:** Real-time configuration of enclosure finish, keycap set, Escape accent, switch profile, and plate material with live build code export and copyable summary.

## Technology Stack

- **Frontend:** React 19, TypeScript 5.8, Vite 6, custom CSS design tokens (`Manrope Variable` + `IBM Plex Mono`, self-hosted OFL fonts).
- **3D Runtime:** Three.js `0.180.0` (lazy-loaded), Meshopt-compressed GLB partitions (`EXT_meshopt_compression`), instanced 81-keycaps with 1024/2048 legend atlases.
- **Hosting:** Vercel static hosting with immutable asset caching and scoped MIME headers in [vercel.json](vercel.json).

## Local Setup & Validation

Requires **Node.js 22.x** (`package.json` `engines.node: "22.x"`).

```powershell
npm ci
npm run typecheck
npm run build
npm run preview
```

Open `http://127.0.0.1:4185/` to view the built `dist/` bundle locally. With the preview running, run the production verification suites:

```powershell
npm run verify:assets
npm run verify:browser
npm run verify:runtime
npm run verify:runtime -- --strict
npm run verify:mechanics
npm run verify:kf005
npm run verify:kf006a
npm run verify:kf008b
```

## Asset Provenance & Audio Attribution

All **172** shipped runtime, image, and audio assets are SHA-256 verified in [tests/production-asset-inventory.json](tests/production-asset-inventory.json):

- `public/media/kf003b/` — 74 canonical Blender Cycles AVIF/WebP derivatives (Build Studio fallbacks, switch macros, and reference renders).
- `public/media/kf-art-002a/` — 18 art-directed AVIF/WebP derivatives.
- `public/media/kf-008a/` — 52 owner-approved editorial AVIF/WebP derivatives, including the final `OR13` desktop Hero (`2752×1536` master) and `OR14` mobile Hero (`2048×2048` master). Raw JPG masters and `.blend` sources live outside Git.
- `public/assets/kf01/kf01-kf004b-b3.1/` — Portable runtime manifest, 4 Meshopt/uncompressed GLB partitions, and 1024/2048 legend atlas pairs.
- `public/audio/kf01-v2/` — 18 normalized 44.1 kHz 16-bit mono WAV samples + `manifest.json` sourced under **CC0-1.0** (public domain). See [docs/AUDIO_SOURCES.md](docs/AUDIO_SOURCES.md) and [docs/THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md).

## Deployment

Production deploys automatically from `main` to Vercel (`https://keyform-lake.vercel.app`) using `npm run build` (`dist/`). [vercel.json](vercel.json) configures `no-cache` on HTML/favicon, `public, max-age=31536000, immutable` on hashed assets/media/GLBs/audio, `model/gltf-binary` on `.glb`, `image/avif` and `image/webp` on `/media/kf-008a/`, and `audio/wav` scoped strictly to `/audio/kf01-v2/(.*\.wav)` so `manifest.json` serves `application/json`. [.vercelignore](.vercelignore) excludes non-production files (`img-generate/`, `.tmp/`, `tests/`, `docs/`).

## Known Limitations

- Performance metrics collected during release verification are synthetic headless/CDN measurements rather than real-user CrUX field telemetry.
- Live WebGL rendering depends on client GPU/WebGL2 support; unsupported, reduced-motion, or constrained-network environments remain on static photography by design.
- Source 3D `.blend` masters and raw JPG Hero masters are intentionally excluded from Git and hosted only in the external asset workspace.

See [docs/HANDOFF.md](docs/HANDOFF.md), [docs/ROADMAP.md](docs/ROADMAP.md), [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md), and [docs/ASSET_PIPELINE.md](docs/ASSET_PIPELINE.md) for engineering history and specifications.
