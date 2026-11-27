// Built in memory by verify-runtime.mjs. This fixture is outside the production entry graph.
import { Matrix3, Raycaster, Vector2, Vector3, type Mesh, type MeshStandardMaterial } from 'three';
import { loadAssetPackage } from '../src/runtime/three/assets';
import { CAMERA_PRESETS } from '../src/runtime/three/lighting';
import type { NativeStage } from '../src/runtime/three/NativeStage';
import { createNativeStage } from '../src/runtime/three/viewportAdapter';

const fixture = document.createElement('div');
Object.assign(fixture.style, { position: 'fixed', inset: '0 auto auto 0', width: '1280px', height: '720px', zIndex: '10000' });
document.body.append(fixture);
let stage: NativeStage;
let abort: AbortController;
let passes: {main: number; auxiliary: number};
let picked: string | null | undefined;
const checks: Record<string, boolean> = {};
const check = (name: string, value: boolean) => { checks[name] = value; };
const close = (a: number, b: number, tolerance = 1e-5) => Math.abs(a - b) < tolerance;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const resources = () => [
  stage.renderer.info.memory.geometries,
  stage.renderer.info.memory.textures,
  stage.renderer.info.programs?.length ?? 0,
];

async function mount(tier: 'standard' | 'balanced' = 'standard') {
  abort = new AbortController();
  const assets = await loadAssetPackage(abort.signal);
  stage = createNativeStage(fixture, assets, {
    signal: abort.signal, reducedMotion: true, progress() {},
    fail(code) { throw new Error(code); },
  });
  passes = {main: 0, auxiliary: 0};
  const render = stage.renderer.render.bind(stage.renderer);
  stage.renderer.render = (scene, camera) => {
    if (stage.renderer.getRenderTarget()) passes.auxiliary++;
    else passes.main++;
    render(scene, camera);
  };
  const canvas = stage.renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  canvas.addEventListener('pointerdown', (event) => {
    const {left, top, width, height} = canvas.getBoundingClientRect();
    const ndc = new Vector2(2 * (event.clientX - left) / width - 1, 1 - 2 * (event.clientY - top) / height);
    const ray = new Raycaster();
    ray.setFromCamera(ndc, stage.camera);
    picked = stage.model.pickFromRay(ray.ray)?.keyId;
    stage.invalidate();
  });
  await stage.setQuality(tier);
  const prepared = stage.model.loadExteriorWithLegend();
  const hidden = !stage.model.keyboardRoot.visible && stage.ground.getTelemetry().bakeCount === 0;
  const {legend, timing} = await prepared;
  stage.setView('exterior', 'atelier', 'threeQuarter', true);
  stage.present();
  return {hidden, legend, timing};
}

function unmount() {
  abort.abort();
  stage.dispose();
  stage.dispose();
}

function project(id: string) {
  const point = stage.model.keyCrownWorldPosition(id)?.project(stage.camera);
  if (!point) throw new Error('Missing projected key ' + id);
  const box = stage.renderer.domElement.getBoundingClientRect();
  return {x: box.left + (point.x + 1) * box.width / 2, y: box.top + (1 - point.y) * box.height / 2};
}

// B3's cap shader already has a test mask output: red is glyph coverage, green is canonical
// key ID, and blue is its complement. Read back actual shaded pixels rather than atlas metadata.
function sampleGlyphMask() {
  const uniforms = new Set<{ kfLegendDebug: { value: number }; kfLegendSize: { value: number } }>();
  stage.model.keyboardRoot.traverse((node) => {
    const material = (node as Mesh).material as MeshStandardMaterial | undefined;
    const ref = material?.userData?.kfLegendUniformRefs;
    if (ref) uniforms.add(ref);
  });
  for (const refs of uniforms) refs.kfLegendDebug.value = 1;
  stage.present();
  const gl = stage.renderer.getContext();
  const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  for (const refs of uniforms) refs.kfLegendDebug.value = 0;
  stage.invalidate();
  const report = stage.model.getLegendReport();
  const counts: Record<string, {n: number; totalY: number}> = {};
  const ids = Object.fromEntries(Object.entries(report.pixelIds).map(([key, id]) => [id, key]));
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const id = ids[g];
    if (!id || r < 48 || Math.abs(g + b - 255) > 1) continue;
    const item = counts[id] ??= {n:0,totalY:0};
    item.n++;
    item.totalY += Math.floor((i / 4) / width);
  }
  return {
    count: Object.keys(counts).length,
    space: counts.Space?.n ?? 0,
    centroids: Object.fromEntries(Object.entries(counts).map(([id, point]) => [id, point.totalY / point.n])),
    sizes: [...new Set([...uniforms].map((refs) => refs.kfLegendSize.value))],
  };
}

async function core() {
  const started = performance.now();
  const init = await mount();
  const initialFrameMs = performance.now() - started;
  const model = stage.model;
  const gl = stage.renderer.getContext();
  const gpuInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = gpuInfo && gl.getParameter(gpuInfo.UNMASKED_RENDERER_WEBGL);
  check('hardware WebGL2', gl instanceof WebGL2RenderingContext && /RTX 4060/i.test(renderer));
  check('Meshopt decoded from declared variant', init.timing.tier === 'meshopt' && init.timing.bytes === 2013932 && init.timing.triangles > 0);
  check('empty shadow guard and exterior visibility gate', init.hidden && stage.ground.getTelemetry().bakeCount === 1);
  check('81 canonical keycaps', model.getResolvedSummary().resolvedKeycaps === 81);
  const legend = model.getLegendReport();
  check('legend contract and blank Space', legend.attached && legend.keyCount === 81 && legend.labeledKeys === 80
    && legend.blankKeys.join() === 'Space' && legend.texture?.generateMipmaps === true
    && legend.texture.colorSpace === 'NoColorSpace' && legend.assetVersion === model.manifest.asset_version);
  const exterior = { calls: stage.renderer.info.render.calls, triangles: stage.renderer.info.render.triangles, ...passes, resources: resources() };
  check('exterior draw budget', exterior.calls <= 65);
  const picking = model.run81KeyPickingTest(1280, 720);
  check('81/81 semantic rays', picking.passed === 81 && picking.failed === 0);
  const pickables = model.getPickableStats();
  check('instanced pickables and helper exclusion', pickables.helperNamed === 0 && pickables.instanced > 0);

  const startIdle = passes.main;
  await wait(3500);
  check('zero frames over 3.5s idle', startIdle === passes.main);
  stage.setView('exterior', 'formFunction', 'threeQuarter', true);
  check('neutral environment reused', model.getEnvironmentTelemetry().bakeCount === 1);
  stage.setView('exterior', 'afterHours', 'threeQuarter', true);
  stage.setView('exterior', 'atelier', 'threeQuarter', true);
  check('two cached PMREM families', model.getEnvironmentTelemetry().bakeCount === 2);
  stage.present();
  const exposure = stage.renderer.toneMappingExposure;
  const camera = stage.camera.position.toArray().join();
  const original = model.getMaterialSnapshot();
  const finishes = ['forest', 'obsidian', 'carbon', 'titanium'] as const;
  const tones = new Set<string | null>();
  let isolated = true;
  for (const finish of finishes) {
    model.applyCasePreset(finish);
    const colors = model.getMaterialSnapshot();
    tones.add(colors.caseColorHex);
    isolated &&= original.keycapModHex === colors.keycapModHex && original.keycapAlphaHex === colors.keycapAlphaHex;
  }
  check('four finishes and isolated Charcoal', tones.size === 4 && isolated && original.keycapAlphaHex === '#1a1f1e');
  check('camera and exposure invariant', stage.renderer.toneMappingExposure === exposure && stage.camera.position.toArray().join() === camera);
  model.applyCasePreset('forest');
  stage.setCamera('top', true);
  stage.present();
  const desktopGlyph = sampleGlyphMask();
  check('desktop glyph pixels and blank Space', desktopGlyph.count === 80 && desktopGlyph.space === 0 && desktopGlyph.sizes.includes(2048));
  await stage.setQuality('balanced');
  const mobileGlyph = sampleGlyphMask();
  check('mobile tier binds new atlas pixels', mobileGlyph.count === 80 && mobileGlyph.space === 0 && mobileGlyph.sizes.includes(1024));
  check('balanced policy', stage.ground.getTelemetry().mode === 'procedural' && stage.renderer.getPixelRatio() <= 1);
  await stage.setQuality('standard');
  const restoredGlyph = sampleGlyphMask();
  check('tier restores atlas pixels', restoredGlyph.count === desktopGlyph.count && restoredGlyph.sizes.includes(2048)
    && stage.ground.getTelemetry().mode === 'cached');
  const obsoleteTier = stage.setQuality('balanced');
  const latestTier = stage.setQuality('standard');
  await Promise.allSettled([obsoleteTier, latestTier]);
  check('overlapping tier keeps latest', model.getLegendTier() === 'desktop' && model.getQualityTier() === 'standard');

  const [internal, duplicate] = await Promise.all([model.loadInternal(), model.loadInternal()]);
  check('duplicate partition requests coalesce', internal === duplicate);
  stage.setView('combined', 'atelier', 'threeQuarter', true);
  stage.present();
  const summary = model.getResolvedSummary();
  check('81 internal stems and nine groups', summary.resolvedSwitchStems === 81 && summary.resolvedGroups.length === 9);
  const housing = model.getOverrideInventory().overrides.find(({sourceMaterial}) => sourceMaterial === 'MAT_Switch_Housing');
  check('installed housing transmission suppressed', model.scanTransmissiveMaterials().length === 0
    && housing?.meshesRetargeted === 89 && housing.change.some(({parameter,after}) => parameter === 'transmission' && after === 0));
  const instancing = model.getInstancingReport();
  check('stable batch identities and press proxies', instancing.totals.batches >= 20 && instancing.totals.instances >= 600
    && instancing.batches.every(({id}) => /^KF01_InstanceBatch_\d{3}$/.test(String(id)))
    && Object.keys(instancing.partitions.exterior?.motions ?? {}).length > 0
    && Object.keys(instancing.partitions.internal?.motions ?? {}).length > 0);
  check('assembled suppression active', instancing.assembledSuppressionActive);
  const baselines = new Map(model.manifest.assembly_groups.map((group) => [group.id, group.motion_keyframes]));
  const assembled = model.getGroupWorldOffsets();
  const gasket = model.keyboardRoot.getObjectByName('KF01_Gasket_TravelWithPlate')!;
  const gasketRest = gasket.position.clone();
  model.applyExplodePose(1);
  check('gasket follows plate and occlusion restores', close(gasket.position.y - gasketRest.y, .022)
    && !model.getInstancingReport().assembledSuppressionActive);
  model.applyExplodePose(0);
  check('gasket returns to rest', gasket.position.distanceTo(gasketRest) < 1e-6);
  for (const t of [0, .11, .23, .25, .5, .75, 1, 0]) {
    model.applyExplodePose(t);
    const offsets = model.getGroupWorldOffsets();
    check('exact assembly pose ' + t, [...baselines].every(([id, frames]) => {
      const right = frames.findIndex((key) => key.t >= t);
      const a = frames[Math.max(0, right - 1)] ?? frames.at(-1)!;
      const b = frames[right] ?? a;
      const weight = a.t === b.t ? 0 : (t - a.t) / (b.t - a.t);
      return offsets[id].every((value, axis) => close(value, a.offset_gltf_m[axis] + weight * (b.offset_gltf_m[axis] - a.offset_gltf_m[axis])));
    }));
  }
  check('exact assembled restoration', JSON.stringify(model.getGroupWorldOffsets()) === JSON.stringify(assembled));
  const maskedMotion: Record<string, unknown> = {};
  stage.setCamera('threeQuarter', true);
  stage.present();
  const shadowBefore = stage.ground.getTelemetry().bakeCount;
  for (const id of ['Esc', 'Enter', 'Space', 'Up']) {
    const cap = model.keyboardRoot.getObjectByName('KF01_Cap_' + id)!;
    cap.updateWorldMatrix(true, false);
    const origin = cap.getWorldPosition(new Vector3());
    const expected = new Vector3(0, -.004, 0).applyMatrix3(new Matrix3().setFromMatrix4(cap.parent!.matrixWorld));
    const firstGlyph = id === 'Esc' || id === 'Enter' ? sampleGlyphMask().centroids[id] : undefined;
    const pressed = model.setKeyPressMm(id, 4);
    const actual = cap.getWorldPosition(new Vector3()).sub(origin);
    stage.present();
    const moved = firstGlyph === undefined ? undefined : sampleGlyphMask().centroids[id];
    const released = model.setKeyPressMm(id, 0);
    const restored = cap.getWorldPosition(new Vector3()).distanceTo(origin);
    const back = firstGlyph === undefined ? undefined : sampleGlyphMask().centroids[id];
    check('local 4 mm cap, stem and spring ' + id, !!pressed && !!released
      && close(pressed.capDeltaY, -.004) && close(pressed.stemDeltaY!, -.004)
      && close(pressed.springScaleY!, 1 - 4 / 5.86, .001)
      && close(released.stemDeltaY!, 0) && close(released.capDeltaY, 0));
    check('transformed vector/restoration ' + id, actual.distanceTo(expected) < 1e-5
      && close(actual.y, -.004 * Math.cos(6.5 * Math.PI / 180)) && restored < 1e-6);
    if (id === 'Esc' || id === 'Enter') {
      check('glyph moves and restores ' + id, firstGlyph !== undefined && moved !== undefined && back !== undefined
        && Math.abs(moved - firstGlyph) >= 2 && Math.abs(back - firstGlyph) <= 1);
      maskedMotion[id] = {firstGlyph,moved,back,actual: actual.toArray(),expected: expected.toArray()};
    }
  }
  model.setKeyPressMm('Esc', 4);
  model.setKeyPressMm('Enter', 2);
  const initialOffsets = ['Esc','Enter'].map((id) => model.keyCrownWorldPosition(id)!.y);
  model.setKeyPressMm('Esc', 0);
  check('independent simultaneous press', model.keyCrownWorldPosition('Esc')!.y > initialOffsets[0]
    && close(model.keyCrownWorldPosition('Enter')!.y, initialOffsets[1], 1e-6));
  model.setKeyPressMm('Enter', 0);
  stage.present();
  check('keypress and camera changes do not rebake ground', shadowBefore === stage.ground.getTelemetry().bakeCount);
  model.setKeyColorOverrideWithLegend('Esc', '#c81e3a');
  model.applyCasePreset('obsidian');
  model.setSharedKeycapColor('#dedede');
  check('per-key override survives finish and shared color', model.getKeyColorOverrides().Esc === '#c81e3a');
  model.setKeyColorOverrideWithLegend('Esc', null);
  model.setSharedKeycapColor(null);
  check('per-key override clears independently', model.getKeyColorOverrides().Esc === undefined);

  model.rotateEncoder(3);
  model.pushEncoder(true);
  const standard = model.getEncoderState();
  check('standard encoder 36° and 0.5 mm', standard.knobNodePresent && standard.shaftNodePresent
    && close(standard.angleDeg, 36, .01) && close(standard.pushMm, .5, .001));
  const beforeMacro = model.getPickableStats().total;
  await model.setEncoderPresentation('macro');
  const macro = model.getEncoderReport();
  check('macro is exclusive on same pivot', macro.macroSamePivotAsStandard === true && !macro.standardVisible
    && macro.macroVisible && close(macro.knobAngleDeg,36,.01) && close(macro.pushMm,.5,.001));
  check('macro does not add pickables', beforeMacro === model.getPickableStats().total);
  model.rotateEncoder(-3);
  model.pushEncoder(false);
  model.unloadMacroEncoder();
  const restored = model.getEncoderReport();
  check('macro unload restores standard', !restored.macroMounted && restored.standardVisible && restored.knobAngleDeg === 0 && restored.pushMm === 0);
  const oldMacro = model.setEncoderPresentation('macro');
  const newMacro = model.setEncoderPresentation('standard');
  await Promise.allSettled([oldMacro, newMacro]);
  check('stale macro cannot publish', !model.getEncoderReport().macroMounted && model.getEncoderPresentation() === 'standard');

  const priorPasses = { ...passes };
  stage.setView('exploded', 'formFunction', 'exploded', true);
  stage.present();
  const exploded = {
    calls: stage.renderer.info.render.calls, triangles: stage.renderer.info.render.triangles,
    main: passes.main - priorPasses.main, auxiliary: passes.auxiliary - priorPasses.auxiliary,
    resources: resources(),
  };
  check('exploded draw budget', exploded.calls <= 120 && exploded.calls > exterior.calls);
  check('exploded ground below chassis', stage.ground.getTelemetry().floorY < model.getBottomChassisOffsetY());
  await model.loadHeroSwitch();
  stage.setView('hero_switch', 'afterHours', 'heroSwitch', true);
  const transmission = [];
  for (const variant of ['linear45', 'tactile58', 'silent50'] as const) {
    model.applyHeroSwitchVariant(variant);
    stage.present();
    transmission.push(model.scanTransmissiveMaterials().find(({name}) => name === 'MAT_Hero_PC_Lid')?.transmission ?? 0);
  }
  check('three switch transmissions', transmission.every((value, i) => close(value, [.72, 0, .5][i])));
  check('seven approved camera presets', Object.keys(CAMERA_PRESETS).length === 7
    && Object.values(CAMERA_PRESETS).every(({fov,near,far}) => fov > 0 && near > 0 && far > near));
  stage.setView('exterior', 'atelier', 'top', true);
  stage.present();
  return { renderer, initialFrameMs, exterior, exploded, desktopGlyph, mobileGlyph, restoredGlyph, maskedMotion, transmission };
}

async function remounts() {
  unmount();
  const cycles: number[][] = [];
  for (let i = 0; i < 4; i++) {
    await mount();
    cycles.push(resources());
    unmount();
  }
  check('four resource snapshots stable after warmup', cycles.every((current) => current.join() === cycles[0].join()));
  check('double disposal clears canvas', fixture.querySelectorAll('canvas').length === 0);
  fixture.remove();
  return cycles;
}

Object.assign(globalThis, { keyformFixture: { core, project, picked: () => picked, remounts, checks } });
