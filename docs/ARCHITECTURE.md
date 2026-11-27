# KEYFORM — Website Information Architecture & Technical Architecture

> **Status:** Preliminary Foundation (KF-001)  
> **Scope:** Client-only experimental product showcase and interactive 3D configurator. No backend, database, authentication, or checkout.

KF-004B adopts the [current roadmap](ROADMAP.md) for stack and release gates. The R3F, Tailwind, and single-GLB options below describe the KF-001 proposal. Production uses plain CSS, native Three.js adapters in P1, and the independently loaded B3 partitions.

## 1. Website Information Architecture

The experience is structured as a single cohesive vertical editorial flow anchored by two interactive technical stations (**Interactive Mechanical Anatomy** and **Build Studio**).

| # | Section | Purpose | Core Content & Interactions | Required Media Assets |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **Hero Product Reveal** | Immediate hardware flagship presence; establish *FORM / FUNCTION × AFTER HOURS*. | Full-bleed dark studio hero of `KF—01`, minimal top navigation, model mark (`KF—01`), tagline (*Precision in every press.*), and direct CTA jumping to **Build Studio** or **Engineering**. | High-res Blender Cycles hero still (`AVIF`/`WebP`, desktop 16:9 + mobile 4:5 crops). Zero blocking WebGL on initial paint. |
| **02** | **Engineering Bento Grid** | Communicate core industrial engineering specs at a glance in a disciplined Swiss grid. | Asymmetric 6–8 tile Bento Grid: `75% ANSI Exploded`, `6063 CNC Aluminium`, `Silicone Gasket Mount`, `6.5° Ergonomic Slope`, `EC11 Knurled Rotary Encoder`, `Hot-Swap + Unified USB-C`. Subtle hover inspection; no fake dashboards. | 4–6 Cycles macro detail renders (`AVIF`/`WebP`) + crisp vector engineering callouts/diagrams. |
| **03** | **Interactive Mechanical Anatomy** | Reveal the 9-layer internal stack from keycaps to weighted bottom chassis. | Toggleable or scrubbed **Assembled ↔ Exploded** view with interactive layer selector (`01` Keycaps → `09` Bottom Chassis & Weight). Selecting a layer highlights it and displays concise material/function specs. | Cycles exploded stack stills (or lightweight layer-isolated renders) on mobile/fallback; synchronized exploded GLB mode or pre-rendered exploded frame sequence (only if proven lighter/sharper than live WebGL for this section). |
| **04** | **Switch Lab** | Let visitors compare KEYFORM's three switch archetypes visually and interactively. | Three-way selector (`KF—Linear 45`, `KF—Tactile 58`, `KF—Silent 50`). Interactive press-to-test key/stem trigger (pointer & keyboard `Space`) showing `4.0 mm` travel animation, nominal force-travel curve (clean SVG), and housing/stem cutaway. Optional muted-by-default stylized switch preview sound. | 3 Cycles macro switch renders (`AVIF`/`WebP`), clean SVG force-travel diagram, optional tiny `<50 KB` WebAudio/MP3 tactile clicks. |
| **05** | **Build Studio** *(Signature Feature)* | Real-time 3D customization of `KF—01` with immediate visual and structural feedback. | **Real-time 3D viewport** with smooth orbit camera, preset angles (*Front ¾*, *Top*, *Profile*, *Rear USB-C*), **Assembled / Exploded** toggle, and floating selective-glass HUD controls:<br>• **Default state (KF-003B policy):** *Forest* aluminium case + **Unified Charcoal PBT** across all 81 keys (including `Esc`, *Matched* accent) + *Linear 45* + *Aluminium* plate<br>• Case finish (`Forest`, `Obsidian`, `Carbon`, `Titanium`)<br>• Keycap colorway (`Unified Charcoal`, `Porcelain Light`, `Two-Tone Slate`)<br>• Optional accent key (`Matched` default, `Signal`, `Ivory`, `Forest` on `Esc`)<br>• Switch choice (`Linear 45`, `Tactile 58`, `Silent 50` — visible when exploded or cap-lifted)<br>• Plate material (`Aluminium`, `FR4`, `Polycarbonate`, `Brass`)<br>• Live **Configuration Summary** + **Save Local (`localStorage`)** + **Copy Shareable URL** (compact query-string state). | Partitioned, optimized, instanced real-time WebGL 2 GLBs (`KF-003C`: exterior shell + lazy internal mechanical stack) + lightweight Studio `.hdr`/`.ktx2` PMREM environment map + static Cycles fallback stills. |
| **06** | **Material Library** | Tactile editorial close-up of the physical surfaces behind KF—01. | Curated tactile cards for *Bead-Blasted 6063 Aluminium*, *Dye-Sublimated PBT*, *Brushed Brass / PVD Weight*, *Open-Cell Poron & Silicone*, *Knurled Metal Encoder*. Focus on texture grain, finish spec, and physical role. | 4–5 Cycles extreme macro surface renders (`AVIF`/`WebP`). |
| **07** | **Closing Product Statement** | Quiet, high-conviction brand sign-off. | Architectural rear/profile silhouette of `KF—01`, concise summary statement, quick link back to Build Studio with current configuration preserved, and minimal colophon crediting the experimental project. | 1 Cycles low-key silhouette render (`AVIF`/`WebP`). |

## 2. Minimal Frontend Stack Evaluation

Every dependency must justify its bundle cost. Do not install unused libraries.

| Layer | Recommended Choice | Justification & Restraint |
| :--- | :--- | :--- |
| **UI Framework** | `React 19` + `TypeScript` | Component architecture for Build Studio state, Switch Lab, and typed configuration schema. |
| **Build Tool** | `Vite` | Fast HMR, clean code-splitting (crucial to lazy-load Three.js/R3F only when Build Studio enters viewport). |
| **Styling** | `Tailwind CSS v4` (or lean CSS Modules + CSS custom properties) | Candidate: Tailwind CSS v4 paired with semantic CSS design tokens (`--kf-*`) in `tokens.css` for Swiss grid consistency and zero runtime CSS-in-JS overhead. |
| **3D Engine** | `three` + `@react-three/fiber` | Declarative scene graph, instancing, material swapping, and clean lifecycle disposal for Build Studio. |
| **3D Helpers** | `@react-three/drei` *(strictly selective)* | Use only tree-shaken essentials: `OrbitControls`, `Environment` (or custom PMREM), `ContactShadows` (baked/single-frame), `useGLTF`. Avoid heavy post-processing (`@react-three/postprocessing`) unless proven necessary within frame budget. |
| **Animation** | **CSS Transitions + Web Animations API** first; evaluate `motion` or `gsap` only if needed | Do not install both GSAP and Motion. Standard UI/bento micro-interactions need zero animation library. Add lightweight `gsap` (ScrollTrigger) *only* if Anatomy requires scroll-scrubbed choreography. |
| **State & Persistence** | React state + URLSearchParams + `localStorage` | No Redux/Zustand required unless Build Studio state grows complex; URL query params give free shareable builds (e.g., `?case=obsidian&caps=porcelain&accent=signal&sw=tactile&plate=brass`). |

## 3. Hybrid Asset Delivery Strategy

1. **Blender Cycles Static Renders (`AVIF` primary, `WebP` fallback):**
   - Powers Hero, Engineering Bento Grid, Material Library, Switch Lab stills, and Closing Statement.
   - Guarantees instant First Contentful Paint (`FCP`) and zero GPU spin-up on page load.
   - Served via `<picture>` with explicit `width`/`height` and `aspect-ratio` to prevent Cumulative Layout Shift (`CLS < 0.1`).
2. **Single Optimized Real-Time GLB (`kf01_studio.glb`):**
   - Powers **Build Studio** (and optionally Interactive Mechanical Anatomy if shared).
   - Lazy-loaded via `IntersectionObserver` / dynamic `import()` so initial page load never downloads Three.js or the 3D model until the user approaches Build Studio or clicks *"Open Build Studio"*.
   - Uses mesh instancing (for switches, 1u keycaps, gaskets, screws) and runtime PBR material/color swapping so all finish combinations share one compact binary.
3. **Optional Image Sequences:**
   - Only consider a short WebP/AVIF frame sequence (e.g., 24–36 frames) for the Anatomy exploded transition *if* profiling shows it is materially faster and visually sharper than mounting a second WebGL context. Never maintain two active WebGL canvases simultaneously.

## 4. Hardware Targets & Performance Budgets

- **Authoring hardware:** Intel Core i5-12400F, NVIDIA RTX 4060 (8 GB VRAM).
- **Runtime target devices:** Ordinary integrated-GPU laptops (Intel Iris Xe / Apple M1 / AMD Radeon integrated) and mid-range mobile browsers.

| Metric | Target Budget | Notes |
| :--- | :--- | :--- |
| Initial JS bundle (gzipped, excl. 3D chunk) | `≤ 90 KB` | Hero + Bento + Editorial must load cleanly before WebGL chunk. |
| Lazy-loaded 3D chunk (Three + R3F + selective Drei, gzipped) | `≤ 220 KB` | Dynamically imported on demand. |
| `kf01_studio.glb` | `≤ 2.5 MB` (stretch goal `≤ 1.5 MB`) | Benchmark Meshopt and Draco on the staged asset. Use instanced switches/keycaps, shared material slots, and `≤ 1K` normal/roughness maps. |
| Studio Environment Map (`.hdr` / `.ktx2` PMREM) | `≤ 350 KB` | Low-res `256×128` or `512×256` blurred studio lighting map. |
| Hero image (`AVIF` desktop / mobile) | `≤ 180 KB` / `≤ 90 KB` | Preloaded `<link rel="preload" as="image">`, `fetchpriority="high"`. |
| LCP / CLS / INP | `LCP < 2.2s`, `CLS < 0.05`, `INP < 100ms` | Measured on throttled desktop & mobile profiles. |
| Build Studio Frame Rate | `60 fps` desktop, `≥ 30 fps` mobile/iGPU | Cap `dpr={[1, 2]}` (or `[1, 1.5]` on mobile), render on demand (`frameloop="demand"`) when camera/animations are idle! |
| Draw Calls (Build Studio) | `≤ 40` draw calls | Achieved via `InstancedMesh` for switches, screws, gaskets, and keycap groups. |

## 5. Graceful WebGL Fallbacks

If WebGL is unavailable, context is lost (`webglcontextlost`), the device reports `saveData` / low-memory constraints, or the user toggles *Lite Mode*:
- Build Studio renders a high-resolution Cycles fallback image corresponding to the selected case/keycap combination (with instant angle tabs: *Front ¾*, *Top*, *Exploded*) while preserving the exact same configuration controls, summary panel, local save, and shareable URL.
- **Frameloop discipline:** Use `frameloop="demand"` in React Three Fiber, invalidating frames only during pointer orbit, damping settle, material transition, exploded-view tween, or keypress animation — keeping idle GPU usage near `0%` on laptops and phones.
