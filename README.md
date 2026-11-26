# KEYFORM — Mechanical Precision

**Product:** `KF—01`  
**Tagline:** *Precision in every press.*  
**Creative Direction:** `FORM / FUNCTION × AFTER HOURS`

KEYFORM is an experimental, fictional premium mechanical keyboard brand and interactive product website. It combines photorealistic Blender CGI, Swiss-inspired editorial typography, disciplined Bento Grid architecture, selective glassmorphism, interactive mechanical anatomy, and a real-time 3D **Build Studio** configurator.

> **Project Status:** `KF-003B` Complete — Approved `KF-003A-R3` canonical geometry frozen (`4af6fdd`); all 18 Cycles OptiX production PNG masters (15 core + 3 Build Studio fallback enclosures) and 74 responsive AVIF/WebP web derivatives verified and manifested. Ready for `KF-003C` upon owner approval.

## Repository Structure

```text
KEYFORM/
├── .gitattributes
├── .gitignore
├── AGENTS.md                   # Operating rules and scope guardrails for AI agents
├── README.md                   # Project overview and quick navigation
└── docs/
    ├── PRODUCT_SPEC.md         # KF—01 specifications (verified standards vs. fictional specs)
    ├── CREATIVE_DIRECTION.md   # Visual identity, palette candidates, typography, lighting, motion
    ├── ARCHITECTURE.md         # Website IA, minimal frontend stack, performance budgets
    ├── ASSET_PIPELINE.md       # Mechanical hierarchy, Blender master rules, GLB & static export
    ├── ROADMAP.md              # Phased execution plan (KF-001 through KF-007)
    └── HANDOFF.md              # Current state, review assets, and next-phase entry criteria
```

## External Asset Workspace

Large binary production files (`.blend` masters, Cycles `.exr`/`.png` renders, HDRIs, and raw texture sources) are intentionally excluded from Git and live in a dedicated local workspace outside this repository:

- Asset workspace: `D:\Assets\KEYFORM\`. The frozen approved geometry master is at `blender\kf01_kf003a_r3.blend` (verified recovery copy under `backups\kf003a-r3-approved\`) with canonical Alternative A layout in `reference\kf01_layout.json`. The versioned production lookdev master is at `blender\kf01_kf003b_prod.blend`, with all 18 full-resolution PNG masters and contact sheet in `renders\cycles-raw\kf003b-prod\`, 74 responsive AVIF/WebP web derivatives in `renders\web-export\kf003b\`, and full asset manifest in `kf003b\validation\production-asset-manifest.json`. See [docs/ASSET_PIPELINE.md](docs/ASSET_PIPELINE.md).

Only optimized, web-ready derivatives (`.glb`, `.avif`, `.webp`, `.woff2`) will enter the repository once asset budgets are verified in later phases.

## Key Documents

- **Product & Engineering:** [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md)
- **Visual Identity:** [docs/CREATIVE_DIRECTION.md](docs/CREATIVE_DIRECTION.md)
- **Frontend & IA:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **3D & Media Pipeline:** [docs/ASSET_PIPELINE.md](docs/ASSET_PIPELINE.md)
- **Milestones:** [docs/ROADMAP.md](docs/ROADMAP.md)
- **Next Phase Handoff:** [docs/HANDOFF.md](docs/HANDOFF.md)
