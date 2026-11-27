// Compiled in memory by tests/scripts/verify-kf005.mjs; outside the production bundle graph.
import { loadAssetPackage } from '../src/runtime/three/assets';
import { createNativeStage } from '../src/runtime/three/viewportAdapter';
import type { NativeStage } from '../src/runtime/three/NativeStage';
import type { AssemblyGroupId } from '../src/runtime/types';
import { MechanicalAudioEngine } from '../src/audio/engine';
import { ANATOMY_LAYERS } from '../src/data/kf01Data';

const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

async function runRuntimeChecks() {
  const checks: Record<string, boolean> = {};
  const check = (name: string, ok: boolean) => {
    checks[name] = Boolean(ok);
  };

  const abort = new AbortController();
  const assets = await loadAssetPackage(abort.signal);
  const stage: NativeStage = createNativeStage(fixtureRoot, assets, {
    signal: abort.signal,
    reducedMotion: true,
    progress() {},
    fail(code) {
      throw new Error('Stage failed: ' + code);
    },
  });

  try {
    await stage.setQuality('standard');
    await stage.model.loadExteriorWithLegend();
    await stage.model.loadInternal();
    stage.setView('combined', 'formFunction', 'threeQuarter', true);
    stage.present();

    // --- 1. Anatomy 9-layer mapping, focus isolation, material invariance, explode reversibility ---
    const manifestIds = stage.model.manifest.assembly_groups.map((g) => g.id);
    const uiIds = ANATOMY_LAYERS.map((l) => l.groupName);
    check(
      'anatomy: 9 UI layers map 1:1 to manifest assembly_groups',
      uiIds.length === 9 &&
        manifestIds.length === 9 &&
        uiIds.every((id) => manifestIds.includes(id)) &&
        new Set(uiIds).size === 9,
    );

    const beforeMats = stage.model.getMaterialSnapshot();
    const assembledOffsets = stage.model.getGroupWorldOffsets();
    stage.model.applyExplodePose(1);
    stage.present();

    let allNineFocusClean = true;
    let sharedMatMutated = false;
    for (const id of uiIds as AssemblyGroupId[]) {
      stage.model.setFocusedAssemblyGroup(id);
      stage.present();
      const rep = stage.model.getAssemblyGroupFocusReport();
      const snap = stage.model.getMaterialSnapshot();
      if (rep.focusedGroupId !== id || rep.dimmedMeshCount <= 0 || rep.focusedVisibleMeshes <= 0) {
        allNineFocusClean = false;
      }
      if (
        snap.caseColorHex !== beforeMats.caseColorHex ||
        snap.keycapAlphaHex !== beforeMats.keycapAlphaHex ||
        snap.keycapModHex !== beforeMats.keycapModHex
      ) {
        sharedMatMutated = true;
      }
    }
    check('anatomy: every one of 9 layers activates non-destructive 3D focus', allNineFocusClean);
    check('anatomy: shared materials never mutated during focus', !sharedMatMutated);

    // Rapid sequential focus changes leave exact final state
    for (const id of uiIds as AssemblyGroupId[]) {
      stage.model.setFocusedAssemblyGroup(id);
    }
    const afterRapid = stage.model.getAssemblyGroupFocusReport();
    check(
      'anatomy: rapid focus switches leave no stale state',
      afterRapid.focusedGroupId === uiIds[uiIds.length - 1],
    );

    // Restore full assembly visibility
    stage.model.setFocusedAssemblyGroup(null);
    stage.present();
    const restoredRep = stage.model.getAssemblyGroupFocusReport();
    const afterMats = stage.model.getMaterialSnapshot();
    check(
      'anatomy: restore full view clears ghost materials cleanly',
      restoredRep.focusedGroupId === null &&
        restoredRep.dimmedMeshCount === 0 &&
        JSON.stringify(afterMats) === JSON.stringify(beforeMats),
    );

    // Exploded <-> assembled reversibility
    stage.model.setFocusedAssemblyGroup('GRP_04_SwitchPlate');
    stage.model.applyExplodePose(0);
    stage.model.setFocusedAssemblyGroup(null);
    stage.present();
    check(
      'anatomy: assembled pose restores exact baseline offsets',
      JSON.stringify(stage.model.getGroupWorldOffsets()) === JSON.stringify(assembledOffsets),
    );

    // --- 2. Standalone Hero Switch mechanical actuation ---
    await stage.model.loadHeroSwitch();
    stage.setView('hero_switch', 'afterHours', 'heroSwitch', true);
    stage.present();

    const expectedTravels: Record<'linear45' | 'tactile58' | 'silent50', number> = {
      linear45: 4.0,
      tactile58: 3.8,
      silent50: 3.7,
    };

    // Cutaway vs assembled presentation check
    stage.model.setHeroSwitchPresentation('cutaway', true);
    stage.present();
    const cutState = stage.model.getHeroSwitchMechanicalState();
    stage.model.setHeroSwitchPresentation('assembled', true);
    stage.present();
    const asmState = stage.model.getHeroSwitchMechanicalState();
    check(
      'switch: cutaway vs assembled shifts upper/stem deterministically and keeps guides stationary',
      cutState.pose === 'cutaway' &&
        asmState.pose === 'assembled' &&
        Math.abs(asmState.upperDeltaY) > 0.004 &&
        close(cutState.guidesDeltaY, 0) &&
        close(asmState.guidesDeltaY, 0),
    );

    // Per-variant press along local -Y, spring compression, guides stationary, exact release
    let allVariantsExact = true;
    for (const [variant, targetMm] of Object.entries(expectedTravels) as Array<
      ['linear45' | 'tactile58' | 'silent50', number]
    >) {
      stage.model.applyHeroSwitchVariant(variant);
      stage.model.setHeroSwitchPresentation('assembled', true);
      const rest = stage.model.getHeroSwitchMechanicalState();
      stage.model.setHeroSwitchTravelMm(targetMm);
      stage.present();
      const pressed = stage.model.getHeroSwitchMechanicalState();
      stage.model.setHeroSwitchTravelMm(0);
      stage.present();
      const released = stage.model.getHeroSwitchMechanicalState();

      const ok =
        pressed.variant === variant &&
        close(pressed.totalTravelMm, targetMm, 1e-4) &&
        close(pressed.stemDeltaY, -targetMm / 1000, 1e-6) &&
        pressed.stemNodeCount === 3 &&
        close(pressed.guidesDeltaY, 0, 1e-6) &&
        pressed.springScaleY < 0.5 &&
        pressed.springScaleY >= 0.35 &&
        close(released.stemDeltaY, rest.stemDeltaY, 1e-6) &&
        close(released.springScaleY, rest.springScaleY, 1e-6) &&
        close(released.guidesDeltaY, 0, 1e-6);
      if (!ok) allVariantsExact = false;
    }
    check(
      'switch: all 3 variants actuate only 3 stem nodes along -Y (4.0/3.8/3.7 mm) & restore exact rest',
      allVariantsExact,
    );

    // 15 repeated press/release cycles accumulate zero drift
    stage.model.applyHeroSwitchVariant('linear45');
    stage.model.setHeroSwitchPresentation('assembled', true);
    const preCycle = stage.model.getHeroSwitchMechanicalState();
    for (let i = 0; i < 15; i += 1) {
      stage.model.setHeroSwitchTravelMm(4.0);
      stage.model.setHeroSwitchTravelMm(0);
    }
    const postCycle = stage.model.getHeroSwitchMechanicalState();
    check(
      'switch: 15 repeated press/release cycles accumulate zero drift',
      close(postCycle.stemDeltaY, preCycle.stemDeltaY, 1e-6) &&
        close(postCycle.springScaleY, preCycle.springScaleY, 1e-6) &&
        close(postCycle.guidesDeltaY, 0, 1e-6),
    );

    // Variant change mid-press releases cleanly
    stage.model.setHeroSwitchTravelMm(4.0);
    stage.model.applyHeroSwitchVariant('tactile58');
    const afterMidSwitch = stage.model.getHeroSwitchMechanicalState();
    check(
      'switch: variant change mid-press releases cleanly to rest',
      afterMidSwitch.variant === 'tactile58' &&
        close(afterMidSwitch.travelMm, 0, 1e-6) &&
        close(afterMidSwitch.stemDeltaY, 0, 1e-6) &&
        afterMidSwitch.phase === 'idle',
    );
  } finally {
    abort.abort();
    stage.dispose();
    fixtureRoot.remove();
  }

  // --- 3. MechanicalAudioEngine unit/integration checks ---
  const audioCalls = {
    contextsCreated: 0,
    decodeCalls: 0,
    startedBuffers: [] as AudioBuffer[],
    fetchUrls: [] as string[],
  };
  const OrigAudioContext = window.AudioContext;
  const origFetch = window.fetch.bind(window);
  let audioFault404 = false;

  class TrackedAudioContext extends OrigAudioContext {
    constructor(options?: AudioContextOptions) {
      super(options);
      audioCalls.contextsCreated += 1;
    }
    override decodeAudioData(
      audioData: ArrayBuffer,
      successCallback?: DecodeSuccessCallback | null,
      errorCallback?: DecodeErrorCallback | null,
    ): Promise<AudioBuffer> {
      audioCalls.decodeCalls += 1;
      return super.decodeAudioData(audioData, successCallback ?? undefined, errorCallback ?? undefined);
    }
    override createBufferSource(): AudioBufferSourceNode {
      const node = super.createBufferSource();
      const origStart = node.start.bind(node);
      node.start = (...args: Parameters<AudioBufferSourceNode['start']>) => {
        if (node.buffer) audioCalls.startedBuffers.push(node.buffer);
        return origStart(...args);
      };
      return node;
    }
  }
  window.AudioContext = TrackedAudioContext as unknown as typeof AudioContext;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const href = String(input);
    if (href.includes('/audio/')) audioCalls.fetchUrls.push(href);
    if (audioFault404 && href.includes('/audio/')) {
      return Promise.resolve(new Response('not found', { status: 404 }));
    }
    return origFetch(input, init);
  };

  try {
    // Inert construction: zero AudioContext, zero fetches
    const engine = new MechanicalAudioEngine({ initialProfile: 'linear-45', initialVolume: 0.6 });
    const idleStats = engine.getStats();
    check(
      'audio-engine: inert construction creates zero AudioContext and zero fetches',
      audioCalls.contextsCreated === 0 &&
        audioCalls.fetchUrls.length === 0 &&
        idleStats.contextState === 'none' &&
        idleStats.sampleState === 'idle',
    );

    // Explicit enable + loadSamples loads manifest + 18 WAVs once
    await engine.enable();
    await engine.loadSamples();
    const fetchesAfterLoad = audioCalls.fetchUrls.length;
    const decodesAfterLoad = audioCalls.decodeCalls;
    const readyStats = engine.getStats();
    check(
      'audio-engine: explicit enable loads manifest + 18 WAVs once and decodes 18 buffers',
      readyStats.sampleState === 'ready' &&
        readyStats.cachedBuffers === 18 &&
        fetchesAfterLoad === 19 &&
        decodesAfterLoad === 18,
    );

    // Playback across all 3 profiles performs zero fetch/decode and uses distinct downstroke banks
    const profileBuffers: Record<string, AudioBuffer | undefined> = {};
    for (const profile of ['linear-45', 'tactile-58', 'silent-50'] as const) {
      engine.setProfile(profile);
      const before = audioCalls.startedBuffers.length;
      engine.keyDown('k-' + profile, 'standard');
      engine.keyUp('k-' + profile, 'standard');
      const after = audioCalls.startedBuffers.length;
      if (after - before === 2) {
        profileBuffers[profile] = audioCalls.startedBuffers[before];
      }
    }
    check(
      'audio-engine: zero fetch/decode on playback & distinct sample banks per profile',
      audioCalls.fetchUrls.length === fetchesAfterLoad &&
        audioCalls.decodeCalls === decodesAfterLoad &&
        Boolean(profileBuffers['linear-45']) &&
        Boolean(profileBuffers['tactile-58']) &&
        Boolean(profileBuffers['silent-50']) &&
        profileBuffers['linear-45'] !== profileBuffers['tactile-58'] &&
        profileBuffers['tactile-58'] !== profileBuffers['silent-50'],
    );

    // Mute immediately prevents playback
    engine.setMuted(true);
    const beforeMute = audioCalls.startedBuffers.length;
    engine.keyDown('k-mute', 'standard');
    engine.keyUp('k-mute', 'standard');
    check('audio-engine: mute immediately prevents playback', audioCalls.startedBuffers.length === beforeMute);
    engine.setMuted(false);

    // Voice cap <= 16 under 30-hit burst
    let maxVoices = 0;
    for (let i = 0; i < 30; i += 1) {
      engine.keyDown('burst-' + i, 'standard');
      maxVoices = Math.max(maxVoices, engine.getStats().activeVoices);
    }
    check(
      'audio-engine: active voice count bounded <= 16 under rapid burst',
      maxVoices > 0 && maxVoices <= 16 && engine.getStats().stolenVoices > 0,
    );

    // Disable & dispose stop playback and prevent stale playback
    engine.disable();
    const beforeDisabled = audioCalls.startedBuffers.length;
    engine.keyDown('after-disable', 'standard');
    check(
      'audio-engine: disable prevents stale playback',
      audioCalls.startedBuffers.length === beforeDisabled &&
        engine.getStats().activeVoices === 0 &&
        !engine.isEnabled(),
    );
    await engine.dispose();
    const beforeDisposed = audioCalls.startedBuffers.length;
    engine.keyDown('after-dispose', 'standard');
    check(
      'audio-engine: dispose permanently closes engine',
      audioCalls.startedBuffers.length === beforeDisposed && engine.getStats().contextState === 'none',
    );

    // Missing/404 audio degrades cleanly without crashing
    audioFault404 = true;
    const faultEngine = new MechanicalAudioEngine();
    await faultEngine.enable();
    let faultThrew = false;
    try {
      await faultEngine.loadSamples();
    } catch {
      faultThrew = true;
    }
    const beforeFaultPlay = audioCalls.startedBuffers.length;
    faultEngine.keyDown('k-fault', 'standard');
    check(
      'audio-engine: 404 audio degrades cleanly to silent fallback',
      faultThrew &&
        faultEngine.getSampleState() === 'error' &&
        audioCalls.startedBuffers.length === beforeFaultPlay,
    );
    await faultEngine.dispose();
    audioFault404 = false;

    // Rapid enable -> disable does not leak or publish stale readiness
    const rapidEngine = new MechanicalAudioEngine();
    const ctxBefore = audioCalls.contextsCreated;
    const enablePromise = rapidEngine
      .enable()
      .then(() => rapidEngine.loadSamples())
      .catch(() => {});
    rapidEngine.disable();
    await enablePromise;
    await wait(50);
    check(
      'audio-engine: rapid enable/disable publishes no stale ready state or context leak',
      !rapidEngine.isEnabled() &&
        rapidEngine.getSampleState() !== 'ready' &&
        audioCalls.contextsCreated <= ctxBefore + 1,
    );
    await rapidEngine.dispose();
  } finally {
    window.AudioContext = OrigAudioContext;
    window.fetch = origFetch;
  }

  return checks;
}

(globalThis as unknown as { kf005Fixture: { runRuntimeChecks: typeof runRuntimeChecks } }).kf005Fixture = {
  runRuntimeChecks,
};
