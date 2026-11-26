# KEYFORM — Phase Handoff

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
