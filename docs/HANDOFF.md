# KEYFORM — Phase Handoff

## KF-002 owner review

KF—01 has an editable Blender master and eight neutral Cycles review stills. The geometry candidate uses a Forest case, charcoal keycaps, ivory Esc, and brass weight. The repo opened clean on `main` at `e62546f`. Documentation changes are available for review before the KF-002 checkpoint.

| Deliverable | External path under `D:\Assets\KEYFORM\` |
| --- | --- |
| Editable master | `blender\kf01_master.blend` |
| Reproduction commands | `README.md` and `scripts\` |
| Canonical key positions | `reference\kf01_layout.json` |
| Component dimension references and audit | `reference\component-dimensions.md` |
| Eight full-size stills and contact sheet | `renders\kf002\` |
| Evaluated geometry, movement and Cycles telemetry | `validation\geometry.json`, `validation\clearance.json`, `validation\render-performance.json` |
| Workstation and package integrity | `validation\workstation.txt`, `validation\SHA256SUMS.txt` |

## Decisions and measured results

- The ANSI layout has **81 keys plus a push encoder** and measures `309.5625 × 119.0625 mm` in the typing plane. The evaluated enclosure plan is `327 × 138 mm` and the foot-to-highest-point product height is `50.49 mm`. The measured slope rises **6.5°** toward the rear.
- The minimum base spacing is `1.05 mm` on the `19.05 mm` key grid. Evaluated rays verify the 81 MX plate openings and the PCB holes, the `1.50 mm` plate, the `1.60 mm` PCB, and the `5.00 mm` plate-to-PCB top stack.
- Backspace (2u), Enter (2.25u), and left Shift (2.25u) use `23.8 mm` stabilizer spans. The spacebar (6.25u) uses `100 mm`. The acoustic stack uses `3.0 mm` installed Poron above `0.5 mm` IXPE.
- The rear USB-C shell measures `8.94 × 3.46 mm` at the modeled face. The split case throat is `9.70 × 4.22 mm` with a larger outer lead-in. The EC11E reference sets the `12°` detents and `0.5 mm` push.
- The model has a desk-level root, inclined pivot, and nine layer groups. Frames **1 / 26 / 51 / 76 / 101** store assembled, 25%, 50%, 75%, and full poses. The daughterboard withdraws after the seam opens. Gaskets travel with the plate tabs.
- The evaluated triangle sweep covered 63 exploded time samples and nine downstroke depths. It found zero unclassified intersections over the `0.06 mm` sampling threshold. The log lists 164 intended interface pairs and reports the sampled-method limitations.
- The `press_mm` property on each cap controls its `4 mm` travel, linked stem, spring, and applicable stabilizer sliders. The `KF01_Encoder_Input` empty controls rotation and push. Controls and assembly notes are in the master’s **KF01 | Start Here** text block.
- The master is `3,242,856 bytes` with no missing external references. An isolated copy reopened and ran its keypress and pose controls with automatic scripts disabled. The model contains `949` renderable product objects, `204` distinct product meshes, `742` linked duplicate objects, and `617,512` evaluated product triangles. The geometry log includes counts for all nine groups.
- Blender 5.3.0 detected CUDA and OptiX on the RTX 4060 (8,188 MiB) with an Intel Core i5-12400F. Cycles used OptiX and up to 40 samples at `1,000–1,140 px` on the longest edge. The eight renders took `27.05 s` summed wall time. The sampled peak of `3,500 MiB` measures board-wide framebuffer use.

The close-up switch, stabilizer wire motion, carrier, socket contacts, fastener threads and compressed gasket interfaces are visual approximations. The master supports geometry review and establishes the intended product construction.

## KF-003 entry

Owner approval covers the layout, silhouette, seam, deck openings, weight, and exploded distribution. Begin look development after approval. Start with bead-blasted Forest anodization, matte charcoal PBT, ivory Esc and brass. Use a broad cool key and warm grazing light to read the front chamfer, row sculpt, and knob knurl. Confirm whether the knob follows the case finish or remains independently selectable.

Stage the real-time GLB in a separate scene. Test baked legends and knurling, shared meshes, and per-key instance IDs before setting the export recipe. Verify size and draw calls in the viewer using the criteria in [ASSET_PIPELINE.md](ASSET_PIPELINE.md).

Space Grotesk versus Inter Tight remains a KF-004 decision. Static stills versus a shared GLB for Mechanical Anatomy remains open for KF-003/KF-005.
