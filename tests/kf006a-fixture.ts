// Compiled in memory by tests/scripts/verify-kf006a.mjs; outside the production bundle graph.
import { Color, type Mesh, type MeshStandardMaterial } from 'three';
import {
  ACCENT_KEYS,
  DEFAULT_BUILD_CONFIG,
  ENCLOSURE_FINISHES,
  KEYCAP_SETS,
  PLATE_MATERIALS,
  SWITCH_PROFILES,
} from '../src/data/kf01Data';
import { loadAssetPackage } from '../src/runtime/three/assets';
import {
  DARK_LEGEND_LINEAR,
  ESCAPE_ACCENT_HEX,
  INSTALLED_SWITCH_MATERIALS,
  KEYCAP_SET_PALETTES,
  PLATE_MATERIAL_SPECS,
  createBuildConfigApplier,
  resolveKeycapSetRole,
} from '../src/runtime/three/buildConfigRuntime';
import type { NativeStage } from '../src/runtime/three/NativeStage';
import { createNativeStage } from '../src/runtime/three/viewportAdapter';
import type { BuildConfigState } from '../src/runtime/types';

const norm = (hex: string | null | undefined) => (hex ? `#${new Color(hex).getHexString()}` : null);
const close = (a: number, b: number, tol = 0.002) => Math.abs(a - b) <= tol;
const isDarkTint = (tint: [number, number, number] | undefined) =>
  Boolean(tint) &&
  close(tint![0], DARK_LEGEND_LINEAR[0], 0.005) &&
  close(tint![1], DARK_LEGEND_LINEAR[1], 0.005) &&
  close(tint![2], DARK_LEGEND_LINEAR[2], 0.005);
const isLightTint = (tint: [number, number, number] | undefined) =>
  Boolean(tint) && tint![0] > 0.5 && tint![1] > 0.5 && tint![2] > 0.5;

const fixtureRoot = document.createElement('div');
Object.assign(fixtureRoot.style, {
  position: 'fixed',
  inset: '0 auto auto 0',
  width: '1280px',
  height: '720px',
  zIndex: '10000',
  pointerEvents: 'none',
});
document.body.append(fixtureRoot);

function sampleGlyphCount(stage: NativeStage) {
  const uniforms = new Set<{ kfLegendDebug: { value: number }; kfLegendSize: { value: number } }>();
  stage.model.keyboardRoot.traverse((node) => {
    const mat = (node as Mesh).material as MeshStandardMaterial | undefined;
    const ref = mat?.userData?.kfLegendUniformRefs;
    if (ref) uniforms.add(ref);
  });
  for (const refs of uniforms) refs.kfLegendDebug.value = 1;
  stage.present();
  const gl = stage.renderer.getContext();
  const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;
  const pixels = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  for (const refs of uniforms) refs.kfLegendDebug.value = 0;
  stage.invalidate();
  const report = stage.model.getLegendReport();
  const ids = Object.fromEntries(Object.entries(report.pixelIds).map(([k, v]) => [v, k]));
  const seen = new Set<string>();
  let spacePixels = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const id = ids[g];
    if (!id || r < 48 || Math.abs(g + b - 255) > 1) continue;
    if (id === 'Space') spacePixels += 1;
    else seen.add(id);
  }
  return {
    labeledCount: seen.size,
    spacePixels,
    sizes: [...new Set([...uniforms].map((r) => r.kfLegendSize.value))],
  };
}

async function runRuntimeChecks() {
  const checks: Record<string, boolean> = {};
  const details: Record<string, unknown> = {};
  const check = (name: string, ok: boolean, info?: unknown) => {
    checks[name] = Boolean(ok);
    if (info !== undefined) details[name] = info;
  };

  // 1. All existing configuration IDs have explicit bindings
  const allBound =
    ENCLOSURE_FINISHES.every((o) => ['forest', 'obsidian', 'carbon', 'titanium'].includes(o.id)) &&
    KEYCAP_SETS.every((o) => o.id in KEYCAP_SET_PALETTES) &&
    ACCENT_KEYS.every((o) => o.id in ESCAPE_ACCENT_HEX) &&
    SWITCH_PROFILES.every((o) => o.id in INSTALLED_SWITCH_MATERIALS) &&
    PLATE_MATERIALS.every((o) => o.id in PLATE_MATERIAL_SPECS);
  check('runtime: all 18 canonical configuration IDs have explicit bindings', allBound);

  const abort = new AbortController();
  const assets = await loadAssetPackage(abort.signal);
  const stage = createNativeStage(fixtureRoot, assets, {
    signal: abort.signal,
    reducedMotion: true,
    progress() {},
    fail(code) {
      throw new Error('Stage failure: ' + code);
    },
  });

  try {
    const gl = stage.renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    details.renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);

    await stage.setQuality('standard');
    await stage.model.loadExteriorWithLegend();
    stage.setView('exterior', 'atelier', 'top', true);
    const applier = createBuildConfigApplier();

    // 2. Canonical default: uniform Charcoal PBT across all 81 keys + matched Esc + light legends
    applier.apply(stage.model, DEFAULT_BUILD_CONFIG, true);
    stage.present();
    const defAudit = stage.model.getBuildConfigMaterialAudit();
    const all81Charcoal =
      Object.keys(defAudit.keycapColors).length === 81 &&
      Object.values(defAudit.keycapColors).every((hex) => hex === '#1a1f1e');
    const all81LightLegends =
      Object.keys(defAudit.legendTints).length === 81 &&
      Object.values(defAudit.legendTints).every((t) => isLightTint(t));
    check(
      'runtime: canonical default has uniform Charcoal #1a1f1e on all 81 keys and light legends',
      all81Charcoal && all81LightLegends && defAudit.enclosurePreset === 'forest',
      { esc: defAudit.keycapColors.Esc, a: defAudit.keycapColors.A, space: defAudit.keycapColors.Space },
    );

    // 3. All four enclosure finishes update distinctly while preserving keycaps and camera
    const camBefore = stage.camera.position.toArray().join(',');
    const encHexes = new Set<string | null>();
    let capsPreserved = true;
    for (const enc of ENCLOSURE_FINISHES) {
      applier.apply(stage.model, { ...DEFAULT_BUILD_CONFIG, enclosure: enc.id });
      const snap = stage.model.getBuildConfigMaterialAudit();
      encHexes.add(snap.enclosureHex);
      if (snap.keycapColors.A !== '#1a1f1e' || snap.keycapColors.Esc !== '#1a1f1e') capsPreserved = false;
    }
    check(
      'runtime: all 4 enclosure finishes update distinctly with keycap and camera preservation',
      encHexes.size === 4 && capsPreserved && stage.camera.position.toArray().join(',') === camBefore,
      { encHexes: [...encHexes] },
    );
    applier.apply(stage.model, DEFAULT_BUILD_CONFIG);

    // 4 & 5 & 6. Porcelain PBT and Two-Tone Slate semantic grouping + Spacebar + legend contrast
    const alphaColorPorcelain = norm('#ECE9DF');
    const modColorPorcelain = norm('#D8D4C7');
    applier.apply(stage.model, { ...DEFAULT_BUILD_CONFIG, keycaps: 'porcelain-pbt', accent: 'matched' });
    stage.present();
    const porcAudit = stage.model.getBuildConfigMaterialAudit();
    const porcKeysOk = stage.model.manifest.keys.every((k) => {
      const expected = resolveKeycapSetRole(k) === 'alpha' ? alphaColorPorcelain : modColorPorcelain;
      return porcAudit.keycapColors[k.id] === expected;
    });
    const porcContrastOk = stage.model.manifest.keys.every((k) => isDarkTint(porcAudit.legendTints[k.id]));
    check(
      'runtime: Porcelain PBT maps all 81 keys semantically (incl. Space alpha) with dark legends',
      porcKeysOk && porcContrastOk && porcAudit.keycapColors.Space === alphaColorPorcelain,
      { a: porcAudit.keycapColors.A, enter: porcAudit.keycapColors.Enter, space: porcAudit.keycapColors.Space, esc: porcAudit.keycapColors.Esc },
    );

    const alphaColorSlate = norm('#D9DDD8');
    const modColorSlate = norm('#434A46');
    applier.apply(stage.model, { ...DEFAULT_BUILD_CONFIG, keycaps: 'two-tone-slate', accent: 'matched' });
    stage.present();
    const slateAudit = stage.model.getBuildConfigMaterialAudit();
    const slateKeysOk = stage.model.manifest.keys.every((k) => {
      const expected = resolveKeycapSetRole(k) === 'alpha' ? alphaColorSlate : modColorSlate;
      return slateAudit.keycapColors[k.id] === expected;
    });
    const slateContrastOk = stage.model.manifest.keys.every((k) =>
      resolveKeycapSetRole(k) === 'alpha'
        ? isDarkTint(slateAudit.legendTints[k.id])
        : isLightTint(slateAudit.legendTints[k.id]),
    );
    check(
      'runtime: Two-Tone Slate maps mixed alpha/mod batches with per-instance dark/light legend contrast',
      slateKeysOk && slateContrastOk && slateAudit.keycapColors.Space === alphaColorSlate && slateAudit.keycapColors.Enter === modColorSlate,
      {
        a: slateAudit.keycapColors.A,
        aTint: slateAudit.legendTints.A,
        f1: slateAudit.keycapColors.F1,
        f1Tint: slateAudit.legendTints.F1,
        enter: slateAudit.keycapColors.Enter,
        space: slateAudit.keycapColors.Space,
      },
    );

    // 7, 8, 9. Escape accents affect ONLY Esc, contrast correctly, Matched restores base, base-set preserves accent
    applier.apply(stage.model, { ...DEFAULT_BUILD_CONFIG, keycaps: 'charcoal-pbt', accent: 'ivory' });
    const ivoryAudit = stage.model.getBuildConfigMaterialAudit();
    const onlyEscIvory =
      ivoryAudit.keycapColors.Esc === norm('#F2EFE6') &&
      isDarkTint(ivoryAudit.legendTints.Esc) &&
      stage.model.manifest.keys
        .filter((k) => k.id !== 'Esc')
        .every((k) => ivoryAudit.keycapColors[k.id] === '#1a1f1e' && isLightTint(ivoryAudit.legendTints[k.id]));

    applier.apply(stage.model, { ...DEFAULT_BUILD_CONFIG, keycaps: 'porcelain-pbt', accent: 'forest-accent' });
    const forestEscAudit = stage.model.getBuildConfigMaterialAudit();
    const forestEscOk =
      forestEscAudit.keycapColors.Esc === norm('#294B3B') &&
      isLightTint(forestEscAudit.legendTints.Esc) &&
      forestEscAudit.keycapColors.A === alphaColorPorcelain &&
      isDarkTint(forestEscAudit.legendTints.A);

    applier.apply(stage.model, { ...DEFAULT_BUILD_CONFIG, keycaps: 'charcoal-pbt', accent: 'brass-accent' });
    const brassEscAudit = stage.model.getBuildConfigMaterialAudit();
    const brassEscOk =
      brassEscAudit.keycapColors.Esc === norm('#B49A70') &&
      isDarkTint(brassEscAudit.legendTints.Esc) &&
      brassEscAudit.keycapColors.Q === '#1a1f1e';

    // Base-set change preserves explicit non-matched Escape accent (brass-accent)
    applier.apply(stage.model, { ...DEFAULT_BUILD_CONFIG, keycaps: 'two-tone-slate', accent: 'brass-accent' });
    const preservedAccentAudit = stage.model.getBuildConfigMaterialAudit();
    const accentPreserved =
      preservedAccentAudit.keycapColors.Esc === norm('#B49A70') &&
      isDarkTint(preservedAccentAudit.legendTints.Esc) &&
      preservedAccentAudit.keycapColors.A === alphaColorSlate &&
      preservedAccentAudit.keycapColors.Enter === modColorSlate;

    // Matched restores Esc to base-set color for every keycap set
    let matchedRestoresAll = true;
    for (const [setId, expectedEsc, expectDark] of [
      ['charcoal-pbt', '#1a1f1e', false],
      ['porcelain-pbt', modColorPorcelain!, true],
      ['two-tone-slate', modColorSlate!, false],
    ] as const) {
      applier.apply(stage.model, { ...DEFAULT_BUILD_CONFIG, keycaps: setId, accent: 'matched' });
      const snap = stage.model.getBuildConfigMaterialAudit();
      const tintOk = expectDark ? isDarkTint(snap.legendTints.Esc) : isLightTint(snap.legendTints.Esc);
      if (snap.keycapColors.Esc !== expectedEsc || !tintOk) matchedRestoresAll = false;
    }

    check('runtime: Escape accents recolor ONLY canonical Esc with calibrated legend contrast', onlyEscIvory && forestEscOk && brassEscOk);
    check('runtime: base keycap set changes preserve explicit non-matched Escape accent', accentPreserved);
    check('runtime: Matched restores Esc to base keycap set color and legend tint across all 3 sets', matchedRestoresAll);

    // 10 & 11. Both legend tiers (2048 & 1024) + repeated tier switching preserve cap colors, legend contrast, 80 labels, blank Space
    applier.apply(stage.model, { ...DEFAULT_BUILD_CONFIG, keycaps: 'two-tone-slate', accent: 'brass-accent' });
    stage.setCamera('top', true);
    stage.present();
    const g2048 = sampleGlyphCount(stage);
    await stage.setQuality('balanced');
    stage.present();
    const audit1024 = stage.model.getBuildConfigMaterialAudit();
    const g1024 = sampleGlyphCount(stage);
    await stage.setQuality('standard');
    await stage.setQuality('balanced');
    await stage.setQuality('standard');
    stage.present();
    const auditRestored = stage.model.getBuildConfigMaterialAudit();
    const gRestored = sampleGlyphCount(stage);
    check(
      'runtime: 2048 & 1024 tiers and repeated switching preserve 80 legends, blank Space, cap colors, and contrast',
      g2048.labeledCount === 80 &&
        g2048.spacePixels === 0 &&
        g2048.sizes.includes(2048) &&
        g1024.labeledCount === 80 &&
        g1024.spacePixels === 0 &&
        g1024.sizes.includes(1024) &&
        gRestored.labeledCount === 80 &&
        gRestored.spacePixels === 0 &&
        gRestored.sizes.includes(2048) &&
        audit1024.keycapColors.A === alphaColorSlate &&
        audit1024.keycapColors.Esc === norm('#B49A70') &&
        isDarkTint(audit1024.legendTints.A) &&
        isLightTint(audit1024.legendTints.F1) &&
        auditRestored.keycapColors.Esc === norm('#B49A70') &&
        isDarkTint(auditRestored.legendTints.Esc),
      { g2048, g1024, gRestored },
    );

    // 14 & 15. Before internal loads, switch/plate changes do NOT load internal; latest applies on loadInternal()
    const preInternal: BuildConfigState = {
      enclosure: 'obsidian',
      keycaps: 'porcelain-pbt',
      accent: 'forest-accent',
      switchProfile: 'tactile-58',
      plate: 'brass',
    };
    const beforeIntRes = applier.apply(stage.model, preInternal);
    const stillUnloaded = !stage.model.isInternalLoaded() && !beforeIntRes.internalApplied;
    await stage.model.loadInternal();
    const afterIntRes = applier.apply(stage.model, preInternal);
    stage.setView('exploded', 'formFunction', 'exploded', true);
    stage.present();
    const afterIntAudit = stage.model.getBuildConfigMaterialAudit();
    const expectedTactileStem = `#${new Color().setRGB(
      INSTALLED_SWITCH_MATERIALS['tactile-58'].stemLinear[0],
      INSTALLED_SWITCH_MATERIALS['tactile-58'].stemLinear[1],
      INSTALLED_SWITCH_MATERIALS['tactile-58'].stemLinear[2],
    ).getHexString()}`;
    check(
      'runtime: internal partition stays unloaded in exterior view and applies latest switch/plate upon load',
      stillUnloaded &&
        afterIntRes.internalApplied &&
        afterIntAudit.installedSwitchStemHex === expectedTactileStem &&
        afterIntAudit.plateHex === norm(PLATE_MATERIAL_SPECS.brass.colorHex),
      { afterIntAudit: { stem: afterIntAudit.installedSwitchStemHex, plate: afterIntAudit.plateHex } },
    );

    // 12. All 3 switch profiles update isolated GRP_03_Switches stems & opaque housings with 0 transmission, 0 stabilizer leak, 4 mm travel preserved
    const stabSliderBefore = afterIntAudit.stabilizerSliderHex;
    const stabHousingBefore = afterIntAudit.stabilizerHousingHex;
    const stemHexes = new Set<string | null>();
    const housingHexes = new Set<string | null>();
    let switchIsolated = true;
    for (const sw of SWITCH_PROFILES) {
      applier.apply(stage.model, { ...preInternal, switchProfile: sw.id });
      const snap = stage.model.getBuildConfigMaterialAudit();
      stemHexes.add(snap.installedSwitchStemHex);
      housingHexes.add(snap.installedSwitchHousingHex);
      if (
        snap.installedSwitchHousingTransmission !== 0 ||
        snap.stabilizerSliderHex !== stabSliderBefore ||
        snap.stabilizerHousingHex !== stabHousingBefore ||
        stage.model.scanTransmissiveMaterials().length !== 0
      ) {
        switchIsolated = false;
      }
    }
    const travelCheck = stage.model.setKeyPressMm('Esc', 4.0);
    const releaseCheck = stage.model.setKeyPressMm('Esc', 0);
    const travelPreserved =
      Boolean(travelCheck && releaseCheck) &&
      close(travelCheck!.capDeltaY, -0.004, 1e-5) &&
      close(travelCheck!.stemDeltaY ?? 0, -0.004, 1e-5) &&
      close(releaseCheck!.capDeltaY, 0, 1e-6);
    check(
      'runtime: all 3 installed switch profiles update isolated GRP_03 materials (0 transmission, 0 stab leak, 4 mm travel)',
      stemHexes.size === 3 && housingHexes.size === 3 && switchIsolated && travelPreserved,
      { stemHexes: [...stemHexes], housingHexes: [...housingHexes], stabSliderBefore, stabHousingBefore },
    );

    // 13. All 4 plate materials update MAT_Plate_Active with calibrated PBR and 0 transmission
    const plateHexes = new Set<string | null>();
    let platePbrOk = true;
    for (const plt of PLATE_MATERIALS) {
      applier.apply(stage.model, { ...preInternal, plate: plt.id });
      const snap = stage.model.getBuildConfigMaterialAudit();
      const spec = PLATE_MATERIAL_SPECS[plt.id];
      plateHexes.add(snap.plateHex);
      if (
        snap.plateHex !== norm(spec.colorHex) ||
        !close(snap.plateMetalness ?? -1, spec.metalness, 0.01) ||
        !close(snap.plateRoughness ?? -1, spec.roughness, 0.01) ||
        snap.plateTransmission !== 0 ||
        stage.model.scanTransmissiveMaterials().length !== 0
      ) {
        platePbrOk = false;
      }
    }
    check(
      'runtime: all 4 plate materials update MAT_Plate_Active with calibrated PBR and 0 transmission',
      plateHexes.size === 4 && platePbrOk,
      { plateHexes: [...plateHexes] },
    );

    // 16 & 22. Rapid sequence ends in final config, and reset restores full canonical default
    const rapidSequence: BuildConfigState[] = [
      { enclosure: 'titanium', keycaps: 'porcelain-pbt', accent: 'ivory', switchProfile: 'silent-50', plate: 'polycarbonate' },
      { enclosure: 'carbon', keycaps: 'two-tone-slate', accent: 'forest-accent', switchProfile: 'tactile-58', plate: 'fr4' },
      { enclosure: 'obsidian', keycaps: 'porcelain-pbt', accent: 'brass-accent', switchProfile: 'silent-50', plate: 'brass' },
    ];
    for (const cfg of rapidSequence) applier.apply(stage.model, cfg);
    const rapidEnd = stage.model.getBuildConfigMaterialAudit();
    const rapidOk =
      rapidEnd.enclosurePreset === 'obsidian' &&
      rapidEnd.keycapColors.A === alphaColorPorcelain &&
      rapidEnd.keycapColors.Esc === norm('#B49A70') &&
      rapidEnd.plateHex === norm(PLATE_MATERIAL_SPECS.brass.colorHex);

    applier.apply(stage.model, DEFAULT_BUILD_CONFIG);
    const resetAudit = stage.model.getBuildConfigMaterialAudit();
    const resetOk =
      resetAudit.enclosurePreset === 'forest' &&
      Object.values(resetAudit.keycapColors).every((hex) => hex === '#1a1f1e') &&
      Object.values(resetAudit.legendTints).every((t) => isLightTint(t)) &&
      resetAudit.plateHex === norm(PLATE_MATERIAL_SPECS.aluminium.colorHex);

    check('runtime: rapid config sequence settles on exact final state', rapidOk);
    check('runtime: reset restores full canonical default across exterior and internal materials', resetOk);
  } finally {
    abort.abort();
    stage.dispose();
    fixtureRoot.remove();
  }

  return { checks, details };
}

(globalThis as unknown as { kf006aFixture: { runRuntimeChecks: typeof runRuntimeChecks } }).kf006aFixture = {
  runRuntimeChecks,
};
