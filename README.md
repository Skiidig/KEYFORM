# KEYFORM — Mechanical Precision

**Product:** `KF—01`  
**Tagline:** *Precision in every press.*  
**Creative Direction:** `FORM / FUNCTION × AFTER HOURS`

KEYFORM is an experimental, fictional premium mechanical keyboard brand and interactive product website. It combines photorealistic Blender CGI, Swiss-inspired editorial typography, disciplined Bento Grid architecture, selective glassmorphism, interactive mechanical anatomy, and a real-time 3D **Build Studio** configurator.

> **Project Status:** `KF-003A-R3` — Canonical Alternative A geometry frozen and approved. Entering `KF-003B` production lookdev and rendering.

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

- Asset workspace: `D:\Assets\KEYFORM\`. The R3 candidate is at `blender\kf01_kf003a_r3.blend` with six review views in `renders\kf003a-r3\` and updated Alternative A canonical layout in `reference\kf01_layout.json`. The pre-R3 R1/R2 masters, baseline manifest, and scripts have a verified recovery copy under `backups\kf003a-r2-before-r3\`. See [docs/ASSET_PIPELINE.md](docs/ASSET_PIPELINE.md).

Only optimized, web-ready derivatives (`.glb`, `.avif`, `.webp`, `.woff2`) will enter the repository once asset budgets are verified in later phases.

## Key Documents

- **Product & Engineering:** [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md)
- **Visual Identity:** [docs/CREATIVE_DIRECTION.md](docs/CREATIVE_DIRECTION.md)
- **Frontend & IA:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **3D & Media Pipeline:** [docs/ASSET_PIPELINE.md](docs/ASSET_PIPELINE.md)
- **Milestones:** [docs/ROADMAP.md](docs/ROADMAP.md)
- **Next Phase Handoff:** [docs/HANDOFF.md](docs/HANDOFF.md)
