// Built in memory by verify-runtime.mjs. This fixture is outside the production entry graph.
import { Matrix3, Raycaster, Vector2, Vector3, type Mesh, type MeshStandardMaterial } from 'three';
import { loadAssetPackage } from '../src/runtime/three/assets';
import { CAMERA_PRESETS, solveCameraPresetPose } from '../src/runtime/three/lighting';
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
  check('balanced policy', stage.ground.getTelemetry().mode === 'procedural' && stage.renderer.getPixelRatio() <= 1.25);
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

  // ---- KF-QUALITY-002C: Motion craftsmanship, synthetic 30/60/120 Hz timing & invariants ----
  stage.setReducedMotion(false);
  stage.setView('combined', 'atelier', 'threeQuarter', true);
  stage.present();

  const motionTiming: Record<string, unknown> = {};

  // 1. Time-based explode at synthetic 30, 60, and 120 Hz
  const explodeDurations: Record<number, number> = {};
  let explodeMonotonic = true;
  let explodeEndpointsExact = true;
  let explodeMidpointsAligned = true;
  for (const hz of [30, 60, 120]) {
    const dt = 1000 / hz;
    model.setExplodeTarget(0, true);
    stage.step(0);
    model.setExplodeTarget(1, false, 0);
    let t = 0;
    let prev = 0;
    let midVal = 0;
    let midT = 0;
    let steps = 0;
    while (steps < 200) {
      const active = stage.step(t);
      const cur = model.getExplodeProgress();
      if (cur < prev - 1e-9) explodeMonotonic = false;
      if (Math.abs(t - 250) <= dt * 0.6) {
        midVal = cur;
        midT = t;
      }
      prev = cur;
      if (!active) break;
      t += dt;
      steps++;
    }
    explodeDurations[hz] = Number(t.toFixed(1));
    const uMid = midT / 500;
    const expectedMid = uMid < 0.5 ? 4 * uMid * uMid * uMid : 1 - Math.pow(-2 * uMid + 2, 3) / 2;
    if (model.getExplodeProgress() !== 1) explodeEndpointsExact = false;
    if (Math.abs(midVal - expectedMid) > 1e-4) explodeMidpointsAligned = false;
  }
  const explodeConsistent =
    Object.entries(explodeDurations).every(([hz, ms]) => ms >= 499 && ms <= 500 + 1000 / Number(hz) + 1) &&
    explodeMonotonic &&
    explodeEndpointsExact &&
    explodeMidpointsAligned;
  check('explode 30/60/120Hz consistent 500ms monotonic with exact endpoints', explodeConsistent);
  motionTiming.explodeDurationsMs = explodeDurations;

  // 2. Rapid explode reversal scales remaining duration & coalesces cached shadow to <= 1 bake at rest
  model.setExplodeTarget(0, true);
  stage.step(0);
  const bakesBeforeExplode = stage.ground.getTelemetry().bakeCount;
  model.setExplodeTarget(1, false, 0);
  stage.step(0);
  stage.step(200);
  const midProgress = model.getExplodeProgress();
  const bakesMidFlight = stage.ground.getTelemetry().bakeCount;
  model.setExplodeTarget(0, false, 200);
  const afterReversalStart = model.getExplodeProgress();
  let revT = 200;
  let revSteps = 0;
  while (revSteps < 100) {
    const active = stage.step(revT);
    if (!active) break;
    revT += 16.6667;
    revSteps++;
  }
  const revElapsed = revT - 200;
  const expectedRevMs = Math.round(500 * midProgress);
  const bakesAfterSettle = stage.ground.getTelemetry().bakeCount;
  check(
    'explode mid-flight reversal rebases, scales duration, restores 0, <=1 shadow bake at rest',
    midProgress > 0.15 &&
      midProgress < 0.45 &&
      Math.abs(afterReversalStart - midProgress) < 1e-9 &&
      bakesMidFlight === bakesBeforeExplode &&
      revElapsed >= expectedRevMs - 1 &&
      revElapsed <= expectedRevMs + 25 &&
      model.getExplodeProgress() === 0 &&
      JSON.stringify(model.getGroupWorldOffsets()) === JSON.stringify(assembled) &&
      bakesAfterSettle - bakesBeforeExplode === 1,
  );
  motionTiming.explodeReversal = {
    midProgress: Number(midProgress.toFixed(4)),
    revElapsedMs: Number(revElapsed.toFixed(1)),
    expectedRevMs,
    bakesDelta: bakesAfterSettle - bakesBeforeExplode,
  };

  // 3. Camera transitions: identical pose skip, nearby (320-360ms), large arc (420ms) at 30/60/120Hz without clipping
  stage.setCamera('threeQuarter', true);
  stage.step(0);
  stage.setCamera('threeQuarter', false, 0);
  const identicalSkipped = !stage.isMotionActive();

  stage.setCamera('exploded', false, 0);
  const nearbyDuration = stage.getTransitionDurationMs();
  stage.setCamera('threeQuarter', true);
  stage.step(0);

  const cameraDurations: Record<number, number> = {};
  const rearPose = solveCameraPresetPose(CAMERA_PRESETS.rearUsbc, stage.camera.aspect);
  const visibleKeyProbes = ['Esc', 'Delete', 'LCtrl', 'Right'].map((id) => model.keyCrownWorldPosition(id)!);
  let arcNoClipping = true;
  let cameraExactEnd = true;
  for (const hz of [30, 60, 120]) {
    const dt = 1000 / hz;
    stage.setCamera('threeQuarter', true);
    stage.step(0);
    stage.setCamera('rearUsbc', false, 0);
    let t = 0;
    let steps = 0;
    while (steps < 200) {
      const active = stage.step(t);
      const dist = stage.camera.position.length();
      if (stage.camera.position.y < 0.04 || dist < 0.28 || visibleKeyProbes.some((point) => {
        const clip = point.clone().project(stage.camera);
        return Math.max(Math.abs(clip.x), Math.abs(clip.y), Math.abs(clip.z)) >= 1;
      })) arcNoClipping = false;
      if (!active) break;
      t += dt;
      steps++;
    }
    cameraDurations[hz] = Number(t.toFixed(1));
    if (!stage.camera.position.equals(rearPose.position) || !stage.controls.target.equals(rearPose.target) ||
        stage.camera.fov !== rearPose.fov || stage.camera.near !== rearPose.near || stage.camera.far !== rearPose.far) {
      cameraExactEnd = false;
    }
  }
  const largeDuration = stage.getTransitionDurationMs();
  check(
    'camera skips identical pose, nearby 320-360ms, large 420ms consistent 30/60/120Hz no clipping',
    identicalSkipped &&
      nearbyDuration >= 320 &&
      nearbyDuration <= 360 &&
      largeDuration === 420 &&
      Object.entries(cameraDurations).every(([hz, ms]) => ms >= 419 && ms <= 420 + 1000 / Number(hz) + 1) &&
      arcNoClipping &&
      cameraExactEnd,
  );
  motionTiming.camera = { nearbyDuration, largeDuration, rearDurationsMs: cameraDurations };

  const resetPose = solveCameraPresetPose(CAMERA_PRESETS.threeQuarter, stage.camera.aspect);
  const resetSamples = [];
  for (const phi of [0.015, 1.9]) {
    stage.setReducedMotion(true);
    stage.setCamera('threeQuarter', true);
    stage.controls.object.position.setFromSphericalCoords(0.5, phi, 0.9).add(stage.controls.target);
    stage.controls.update();
    stage.step(0);
    const start = stage.camera.position.clone();
    const startPhi = start.clone().sub(stage.controls.target).angleTo(stage.camera.up);
    stage.setReducedMotion(false);
    stage.resetView();
    const duration = stage.getTransitionDurationMs();
    const startActive = stage.step(0);
    const exactStart = stage.camera.position.equals(start);
    let prevPosition = start.clone();
    let maxStep = 0;
    let firstStep = 0;
    for (let ms = 1; ms <= duration; ms = Math.min(duration, ms + 8)) {
      stage.step(ms);
      const displacement = stage.camera.position.distanceTo(prevPosition);
      if (ms === 1) firstStep = displacement;
      maxStep = Math.max(maxStep, displacement);
      prevPosition.copy(stage.camera.position);
      if (ms === duration) break;
    }
    const endDistance = stage.camera.position.distanceTo(resetPose.position);
    const targetDistance = stage.controls.target.distanceTo(resetPose.target);
    const aimError = stage.camera.getWorldDirection(new Vector3())
      .distanceTo(resetPose.target.clone().sub(resetPose.position).normalize());
    const activeAtEnd = stage.isMotionActive();
    resetSamples.push({phi: startPhi, duration, startActive, exactStart, firstStep, maxStep, endDistance, targetDistance, aimError, activeAtEnd});
    check(`reset from polar ${phi} preserves its displayed start, continuous path, and solved end`,
      close(startPhi, phi, 1e-12) && startActive && exactStart && firstStep < 0.001 && maxStep < 0.06 &&
      endDistance === 0 && targetDistance < 1e-12 && aimError < 1e-12 && !activeAtEnd);
  }
  motionTiming.cameraReset = resetSamples;

  // 4. User interruption mid-preset rebases from displayed pose with zero jump
  stage.setCamera('threeQuarter', true);
  stage.step(0);
  stage.setCamera('rearUsbc', false, 0);
  stage.step(0);
  stage.step(180);
  const displayedBeforeInterrupt = stage.camera.position.clone();
  stage.controls.dispatchEvent({ type: 'start' } as never);
  const interruptRebasedCleanly =
    !stage.isMotionActive() && stage.camera.position.distanceTo(displayedBeforeInterrupt) < 1e-6;
  check('preset interruption rebases seamlessly from displayed pose', interruptRebasedCleanly);

  // 5. Orbit damping (45ms half-life, <=250ms tail, direct zoom, 0 shadow rebakes, 2s idle zero draws)
  stage.setCamera('threeQuarter', true);
  stage.step(0);
  const bakesBeforeOrbit = stage.ground.getTelemetry().bakeCount;

  // Direct wheel zoom: radius changes immediately with zero lingering damping tail
  const radiusBeforeZoom = stage.camera.position.length();
  stage.renderer.domElement.dispatchEvent(
    new WheelEvent('wheel', { deltaY: -120, deltaMode: 0, bubbles: true, cancelable: true }),
  );
  const zoomActiveAfterInput = stage.isMotionActive();
  stage.step(16);
  const radiusAfterZoom = stage.camera.position.length();
  check(
    'wheel zoom is direct with zero damping tail and zero shadow bakes',
    !zoomActiveAfterInput &&
      Math.abs(radiusAfterZoom - radiusBeforeZoom) > 1e-4 &&
      stage.ground.getTelemetry().bakeCount === bakesBeforeOrbit,
  );

  const canvas = stage.renderer.domElement;
  const wheel = () => canvas.dispatchEvent(new WheelEvent('wheel', {deltaY:-120, bubbles:true, cancelable:true}));
  stage.setCamera('threeQuarter', true);
  stage.step(0);
  stage.setCamera('rearUsbc', false, 0);
  stage.step(180);
  const offsetBeforeWheel = stage.camera.position.clone().sub(stage.controls.target);
  wheel();
  const offsetAfterWheel = stage.camera.position.clone().sub(stage.controls.target);
  stage.step(500);
  check('wheel interrupts a preset mid-flight and changes only its radius', !stage.isMotionActive() &&
    offsetAfterWheel.angleTo(offsetBeforeWheel) < 1e-6 && offsetAfterWheel.length() < offsetBeforeWheel.length() &&
    stage.camera.position.clone().sub(stage.controls.target).distanceTo(offsetAfterWheel) < 1e-6);
  for (const button of [0, 2]) {
    stage.setCamera('threeQuarter', true);
    stage.step(0);
    const origin = stage.controls.target.clone();
    const orbitOffset = () => stage.controls.object.position.clone().sub(stage.controls.target);
    const beforeDrag = orbitOffset();
    // Synthetic pointers have no browser-owned capture. The rest of the input and render path is real.
    canvas.setPointerCapture = () => {};
    canvas.releasePointerCapture = () => {};
    canvas.dispatchEvent(new PointerEvent('pointerdown', {pointerId:1, pointerType:'mouse', button, clientX:400, clientY:300}));
    canvas.dispatchEvent(new PointerEvent('pointermove', {pointerId:1, pointerType:'mouse', clientX:480, clientY:320}));
    canvas.dispatchEvent(new PointerEvent('pointerup', {pointerId:1, pointerType:'mouse', button}));
    delete (canvas as Partial<HTMLCanvasElement>).setPointerCapture;
    delete (canvas as Partial<HTMLCanvasElement>).releasePointerCapture;
    const desiredTarget = stage.controls.target.clone();
    const desiredOffset = orbitOffset();
    const pendingBeforeWheel = stage.isMotionActive();
    wheel();
    const afterWheel = orbitOffset();
    const poseMoved = button === 0 ? desiredOffset.angleTo(beforeDrag) > 0.01 : desiredTarget.distanceTo(origin) > 0.01;
    const preserved = stage.controls.target.equals(desiredTarget) && afterWheel.angleTo(desiredOffset) < 1e-6;
    const directZoom = Math.abs(stage.camera.position.distanceTo(origin) - afterWheel.length()) < 1e-6 &&
      Math.abs(desiredOffset.length() - afterWheel.length()) > 1e-4;
    // Simulate the first available frame being delayed beyond the input deadline.
    stage.step(performance.now() + 251);
    check(`${button === 0 ? 'angular' : 'pan'} drag target survives immediate wheel with direct zoom and overdue snap`,
      poseMoved && pendingBeforeWheel && preserved && directZoom && !stage.isMotionActive() &&
      stage.camera.position.distanceTo(stage.controls.object.position) < 1e-6);
  }

  // Keyboard orbit runs through the normal demand loop. Only timing tests use step().
  stage.setCamera('threeQuarter', true);
  stage.step(0);
  const startOrbitPos = stage.camera.position.clone();
  canvas.focus();
  canvas.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', shiftKey: true, bubbles: true, cancelable: true }),
  );
  const orbitStarted = stage.isMotionActive();
  const orbitStartMs = performance.now();
  const desiredOrbitPos = stage.controls.object.position.clone();
  let intermediatePose = false;
  while (stage.isMotionActive() && performance.now() - orbitStartMs < 1000) {
    await wait(8);
    intermediatePose ||= stage.camera.position.distanceTo(startOrbitPos) > 1e-4 &&
      stage.camera.position.distanceTo(desiredOrbitPos) > 1e-4;
  }
  const orbitT = performance.now() - orbitStartMs;
  const bakesAfterOrbit = stage.ground.getTelemetry().bakeCount;
  const drawsAfterOrbitSettle = passes.main;
  await wait(2050);
  const idleZeroAfterOrbit = passes.main === drawsAfterOrbitSettle;
  check(
    'keyboard damping renders an intermediate pose, settles, and reaches zero production draws over 2s idle',
    orbitStarted &&
      intermediatePose &&
      orbitT <= 270 &&
      !stage.isMotionActive() &&
      stage.camera.position.distanceTo(startOrbitPos) > 1e-4 &&
      stage.camera.position.equals(desiredOrbitPos) &&
      bakesAfterOrbit === bakesBeforeOrbit &&
      idleZeroAfterOrbit,
  );
  motionTiming.orbitSettleMs = Number(orbitT.toFixed(1));

  canvas.dispatchEvent(new KeyboardEvent('keydown', {code:'ArrowRight', shiftKey:true, bubbles:true, cancelable:true}));
  const wasDamping = stage.isMotionActive();
  const reducedOrbitTarget = stage.controls.object.position.clone();
  const bakesBeforeReducedOrbit = stage.ground.getTelemetry().bakeCount;
  stage.setReducedMotion(true);
  await wait(80);
  check('reduced motion snaps orbit without rebaking an unchanged shadow', wasDamping &&
    !stage.isMotionActive() && stage.camera.position.equals(reducedOrbitTarget) &&
    stage.ground.getTelemetry().bakeCount === bakesBeforeReducedOrbit);
  stage.setReducedMotion(false);

  // 6. Live reduced-motion snaps active explode + camera + HUD inset refits cleanly
  stage.setCamera('exploded', true);
  stage.setBottomInset(72);
  const hudOffsetActive = stage.camera.view?.enabled === true && stage.camera.view.offsetY === 36;
  const withHudDist = stage.camera.position.length();
  stage.setBottomInset(0);
  const hudOffsetCleared = !stage.camera.view || stage.camera.view.enabled === false;
  const withoutHudDist = stage.camera.position.length();
  stage.setCamera('threeQuarter', true);
  model.setExplodeTarget(0, true);
  stage.step(0);
  stage.setCamera('rearUsbc', false, 0);
  model.setExplodeTarget(1, false, 0);
  stage.step(0);
  stage.step(120);
  stage.setReducedMotion(true);
  check(
    'live reduced-motion snaps active animations and HUD inset refits cleanly',
    !stage.isMotionActive() &&
      model.getExplodeProgress() === 1 &&
      stage.camera.position.z < -0.25 &&
      hudOffsetActive &&
      hudOffsetCleared &&
      withHudDist > withoutHudDist + 1e-3,
  );
  model.setExplodeTarget(0, true);
  stage.setView('exterior', 'atelier', 'top', true);
  stage.present();

  return { renderer, initialFrameMs, exterior, exploded, desktopGlyph, mobileGlyph, restoredGlyph, maskedMotion, transmission, motionTiming };
}

async function remounts() {
  // Verify zero post-disposal draws when disposed mid-animation
  stage.setReducedMotion(false);
  stage.setCamera('rearUsbc', false);
  const drawsBeforeDispose = passes.main;
  unmount();
  await wait(120);
  check('zero post-disposal draws during active animation', passes.main === drawsBeforeDispose);
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
