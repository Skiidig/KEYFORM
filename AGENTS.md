# AGENTS.md — KEYFORM Operating Guidelines

This file defines the working contract for any AI agent contributing to **KEYFORM**.

## 1. Repository Boundaries

- **Independent project:** KEYFORM (`D:\GitHub\KEYFORM`) is completely standalone. Never read, reference, or modify TERRA, Asta, or any other repository on disk.
- **No unapproved remotes or deploys:** Do not push to GitHub, create remote repositories, or deploy to Vercel/hosting without explicit user instruction.
- **No large binaries in Git:** Never commit `.blend`, `.exr`, `.hdr`, uncompressed `.png`/`.tiff`, or raw video files. Keep production 3D masters in the external asset workspace (`D:\Assets\KEYFORM\`).

## 2. Design & Engineering Discipline

- **Hardware brand standard:** KEYFORM must read like a disciplined industrial hardware flagship (Dieter Rams / Braun, Teenage Engineering, Leica, Mode Designs), never a generic SaaS template or AI-slop landing page.
- **Distinguish truth from fiction:** Always separate verified mechanical keyboard standards (e.g., Cherry MX 19.05 mm pitch, 14.0 mm plate cutout, 1.5 mm plate, 1.6 mm PCB) from fictional KF—01 brand specifications. Never invent certifications, lab-measured acoustic dB claims, or fabricated manufacturing test results.
- **No irreversible lock-ins early:** Treat candidate palettes, typography pairings, and library choices as reversible until explicitly approved in phase reviews.
- **Anti-patterns to reject:**
  - Excessive gradients, neon glows, or decorative glowing cards.
  - Glassmorphism on every surface (reserve for floating HUD/controls over imagery or 3D).
  - Overly rounded pill/bubble containers (favor crisp industrial radii: `0px`–`6px`).
  - Decorative dashboard widgets or fake telemetry with no functional meaning.
  - Unjustified animation or heavy dependencies.

## 3. Technical & Performance Guardrails

- **Minimal stack:** Add dependencies only when they solve a concrete requirement.
- **Hybrid media first:** Use Blender Cycles static renders (`AVIF`/`WebP`) for editorial photography and a single optimized, instanced `GLB` for the real-time Build Studio.
- **Hardware inclusivity:** Author on desktop (`i5-12400F` / `RTX 4060 8 GB`), but test and budget for integrated-GPU laptops and mid-range mobile devices with graceful static WebGL fallbacks.
- **Accessibility:** Maintain WCAG AA contrast (≥ 4.5:1 body, ≥ 3:1 large/UI), full keyboard navigation, `44×44px` minimum touch targets, and strict `prefers-reduced-motion` compliance.

## 4. Available Skills Policy

- Only invoke skills that are already installed in the environment (currently verified: `ui-ux-pro-max`).
- Do not install additional skills or plugins automatically.

## 5. Phase Workflow

Follow [docs/ROADMAP.md](docs/ROADMAP.md) sequentially. At the end of each phase:
1. Verify internal consistency across docs, assets, or code.
2. Update [docs/HANDOFF.md](docs/HANDOFF.md) with decisions, deliverables, and next-phase entry criteria.
3. Wait for user approval before starting the next phase.
