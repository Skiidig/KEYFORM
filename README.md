# KEYFORM — Mechanical Precision

KEYFORM is a fictional premium mechanical keyboard brand and a product experience for **KF—01**. The production foundation uses the approved KF-004A-R2 frontend and packages the approved KF-003C-B3 WebGL assets for the next integration phase.

## Local build and preview

Use Node.js 22.x and npm 10.5.1 or newer compatible with that Node release. P0 was built locally with Node 26.13.1 and npm 11.20.0. Run the same commands on Node 22 with the checked-in lockfile to validate that preferred environment before release.

```powershell
npm ci
npm run typecheck
npm run build
npm run preview
```

Open [the production preview](http://127.0.0.1:4185/). It serves only the built `dist/` directory on loopback and fails if port 4185 is occupied. Vite development mode uses the same port, so run one at a time. If Windows blocks esbuild scratch operations, set `TEMP` and `TMP` to the ignored repository-local `.tmp/` directory for the command session.

With the preview running, use `npm run verify:assets` and `npm run verify:browser`. The browser smoke uses Edge and allows an `EDGE_PATH` override. Both use `BASE_URL` when supplied and write local review evidence to `.tmp/p0-evidence/` by default.

## Application and assets

- `src/` holds the React, TypeScript, and CSS application. All seven sections render from the static build, including the three photography-first viewport stations. The design-system preview is lazy at `#/design-system`.
- `public/media/kf003b/` holds the 74 approved responsive AVIF/WebP derivatives. The image catalog and preloads use the root deployment path.
- `public/assets/kf01/kf01-kf004b-b3.1/` holds the portable runtime manifest, four individually addressable models, and two legend tier pairs. The static app does not request them. The future runtime will use native Three.js r180 with thin React adapters.
- `tests/` holds the production schema, SHA-256 inventory, and validation scripts. The asset verifier checks the hosted byte inventory and manifest relationships. Source masters and original lab outputs live in the external KEYFORM asset workspace.

See the [roadmap](docs/ROADMAP.md), [phase handoff](docs/HANDOFF.md), [P1 integration guide](docs/KF-004B-P1.md), [product specification](docs/PRODUCT_SPEC.md), and [asset pipeline](docs/ASSET_PIPELINE.md).
