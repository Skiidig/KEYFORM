# KEYFORM — Mechanical Precision

KEYFORM is a fictional premium mechanical keyboard brand and a product experience for **KF—01**. The production foundation combines the approved KF-004A-R2 frontend and the KF-003C-B3 native Three.js runtime. Photography loads first. Visitors can open a live preview in Build Studio, Mechanical Anatomy, or Switch Lab.

## Local build and preview

Use Node.js 22.x and npm 10.5.1 or newer compatible with that Node release. P0 was built locally with Node 26.13.1 and npm 11.20.0. Run the same commands on Node 22 with the checked-in lockfile to validate that preferred environment before release.

```powershell
npm ci
npm run typecheck
npm run build
npm run preview
```

Open [the production preview](http://127.0.0.1:4185/). It serves only the built `dist/` directory on loopback and fails if port 4185 is occupied. Vite development mode uses the same port, so run one at a time. If Windows blocks esbuild scratch operations, set `TEMP` and `TMP` to the ignored repository-local `.tmp/` directory for the command session.

With the preview running, use `npm run verify:assets`, `npm run verify:browser`, `npm run verify:runtime`, and `npm run verify:mechanics`. The Edge tests accept `EDGE_PATH` and `BASE_URL`. P1 evidence goes to `.tmp/p1-evidence/`. `npm run verify:runtime -- --strict` checks React's development lifecycle on a temporary loopback server at port 4191.

## Application and assets

- `src/` holds the React, TypeScript, and CSS application. All seven sections render from the static build. The design-system preview is lazy at `#/design-system`. A shared lease grants exclusive ownership of the native Three.js renderer to the last explicitly activated station.
- `public/media/kf003b/` holds the 74 approved responsive AVIF/WebP derivatives. The image catalog and preloads use the root deployment path.
- `public/assets/kf01/kf01-kf004b-b3.1/` holds the portable runtime manifest, four independently addressable models, and two legend tier pairs. The lazy adapter requests the required partition and resolves it from the manifest.
- `tests/` holds the production schema, SHA-256 inventory, and validation scripts. The asset verifier checks the hosted byte inventory and manifest relationships. Source masters and original lab outputs live in the external KEYFORM asset workspace.

See the [roadmap](docs/ROADMAP.md), [phase handoff](docs/HANDOFF.md), [P2 review handoff](docs/KF-004B-P2.md), [product specification](docs/PRODUCT_SPEC.md), and [asset pipeline](docs/ASSET_PIPELINE.md).
