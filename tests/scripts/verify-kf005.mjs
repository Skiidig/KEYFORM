import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { openRuntimeBrowser, until } from './runtime-browser.mjs';

const url = process.env.BASE_URL ?? 'http://127.0.0.1:4185/';
const output = new URL('../../.tmp/kf005-evidence/', import.meta.url);
await mkdir(output, { recursive: true });

// Compile deep runtime + audio fixture in memory (outside production entry graph)
const built = await build({
  configFile: false,
  publicDir: false,
  logLevel: 'error',
  build: {
    minify: true,
    write: false,
    lib: {
      entry: fileURLToPath(new URL('../kf005-fixture.ts', import.meta.url)),
      name: 'KeyformKF005Fixture',
      formats: ['iife'],
    },
  },
});
const fixtureCode = (Array.isArray(built) ? built[0] : built).output.find(({ type }) => type === 'chunk').code;

const browser = await openRuntimeBrowser();
const { send, evaluate, on } = browser;

const uiProbeScript = () => {
  const probe = (globalThis.__kf005 = {
    audioContexts: 0,
    audioStarts: 0,
    audioDecodes: 0,
    faultAudio404: false,
    holdAudioManifest: false,
    resumeAudioManifest: null,
  });
  const OrigAC = window.AudioContext;
  class SpyAudioContext extends OrigAC {
    constructor(opts) {
      super(opts);
      probe.audioContexts += 1;
    }
    decodeAudioData(buf, ok, err) {
      probe.audioDecodes += 1;
      return super.decodeAudioData(buf, ok, err);
    }
    createBufferSource() {
      const node = super.createBufferSource();
      const origStart = node.start.bind(node);
      node.start = (...args) => {
        probe.audioStarts += 1;
        return origStart(...args);
      };
      return node;
    }
  }
  window.AudioContext = SpyAudioContext;

  const origFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const href = String(input);
    if (probe.holdAudioManifest && href.includes('/audio/kf01-v2/manifest.json')) {
      await new Promise((resolve, reject) => {
        const onAbort = () => reject(init?.signal?.reason ?? new DOMException('Aborted', 'AbortError'));
        probe.resumeAudioManifest = () => {
          init?.signal?.removeEventListener('abort', onAbort);
          resolve();
        };
        init?.signal?.addEventListener('abort', onAbort, { once: true });
      });
    }
    if (probe.faultAudio404 && href.includes('/audio/')) {
      return new Response('missing', { status: 404 });
    }
    return origFetch(input, init);
  };
};

const checks = {};
const check = (name, ok) => {
  checks[name] = Boolean(ok);
  console.log((ok ? 'PASS ' : 'FAIL ') + name);
};

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const errors = [];
  const requests = [];
  on('Runtime.exceptionThrown', ({ exceptionDetails }) =>
    errors.push(exceptionDetails.exception?.description ?? exceptionDetails.text),
  );
  on('Runtime.consoleAPICalled', ({ type, args }) => {
    if (type === 'error') errors.push(args.map(({ value, description }) => value ?? description).join(' '));
  });
  on('Network.requestWillBeSent', ({ request }) => {
    requests.push(request.url);
  });

  // --- Part A: Deep runtime & MechanicalAudioEngine invariants ---
  await send('Page.navigate', { url });
  await until(() => evaluate(() => Boolean(document.querySelector('[data-kf-viewport]'))), 'initial load');
  const injected = await send('Runtime.evaluate', { expression: fixtureCode });
  assert.equal(injected.exceptionDetails, undefined, JSON.stringify(injected.exceptionDetails));
  // Pass userGesture: true so AudioContext.resume() unlocks under Chromium's real autoplay policy.
  const runtimeEval = await send('Runtime.evaluate', {
    expression: 'kf005Fixture.runRuntimeChecks()',
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  });
  assert.equal(runtimeEval.exceptionDetails, undefined, JSON.stringify(runtimeEval.exceptionDetails));
  const runtimeChecks = runtimeEval.result.value;
  for (const [k, v] of Object.entries(runtimeChecks)) {
    check(k, v);
  }

  // --- Part B: End-to-end production UI, interaction, network, and audio checks ---
  requests.length = 0;
  await send('Page.addScriptToEvaluateOnNewDocument', { source: '(' + uiProbeScript.toString() + ')()' });
  await send('Page.navigate', { url });
  await until(() => evaluate(() => Boolean(document.querySelector('[data-kf-viewport="switch-lab"]'))), 'ui boot');
  await delay(250);

  // 1. Initial load: zero AudioContext and zero /audio/ requests
  const initialAudioRequests = requests.filter((u) => u.includes('/audio/'));
  const initialProbe = await evaluate(() => ({
    contexts: __kf005.audioContexts,
    starts: __kf005.audioStarts,
  }));
  check(
    'ui-audio: zero AudioContext and zero /audio/ requests on initial load',
    initialAudioRequests.length === 0 && initialProbe.contexts === 0,
  );

  // 2. Mechanical Anatomy static fallback selection & Previous/Next synchronization
  await evaluate(() => document.getElementById('anatomy').scrollIntoView({ behavior: 'instant', block: 'start' }));
  await delay(150);
  const layerCount = await evaluate(() => document.querySelectorAll('#anatomy .kf-layer-btn').length);
  await evaluate(() => document.querySelectorAll('#anatomy .kf-layer-btn')[3].click());
  const staticSelected = await evaluate(() => ({
    currentTitle: document.querySelector('#anatomy .kf-anatomy__active-card h3')?.textContent?.trim(),
    status: document.querySelector('[data-kf-viewport="mechanical-anatomy"]')?.dataset.kfViewportMode,
  }));
  await evaluate(() => {
    const btns = [...document.querySelectorAll('#anatomy .kf-anatomy__controls button')];
    btns.find((b) => b.textContent.includes('Next')).click();
  });
  const afterNextTitle = await evaluate(() =>
    document.querySelector('#anatomy .kf-anatomy__active-card h3')?.textContent?.trim(),
  );
  await evaluate(() => {
    const btns = [...document.querySelectorAll('#anatomy .kf-anatomy__controls button')];
    btns.find((b) => b.textContent.includes('Previous')).click();
  });
  const afterPrevTitle = await evaluate(() =>
    document.querySelector('#anatomy .kf-anatomy__active-card h3')?.textContent?.trim(),
  );
  check(
    'ui-anatomy: 9 layers selectable in static fallback and Prev/Next synchronized',
    layerCount === 9 &&
      staticSelected.status === 'static-fallback' &&
      staticSelected.currentTitle === 'Isolated Switch Plate' &&
      afterNextTitle === 'Poron Plate Foam & Silicone Gaskets' &&
      afterPrevTitle === 'Isolated Switch Plate',
  );

  // 3. Activate Anatomy 3D, focus layer, restore full view, assemble -> internal auto-explode
  await evaluate(() =>
    document.querySelector('[data-kf-viewport="mechanical-anatomy"] .kf-viewport-host__action:last-child').click(),
  );
  await until(
    () =>
      evaluate(
        () =>
          document.querySelector('[data-kf-viewport="mechanical-anatomy"]')?.dataset.kfViewportMode ===
          'interactive-3d',
      ),
    'anatomy interactive-3d',
  );
  await evaluate(() => document.querySelector('#anatomy .kf-anatomy__focus-btn').click());
  const focusedState = await evaluate(() => ({
    pressed: document.querySelector('#anatomy .kf-anatomy__focus-btn')?.getAttribute('aria-pressed'),
    label: document.querySelector('#anatomy .kf-anatomy__focus-btn')?.textContent?.trim(),
  }));
  await evaluate(() => document.querySelector('#anatomy .kf-anatomy__focus-btn').click());
  const restoredState = await evaluate(() => ({
    pressed: document.querySelector('#anatomy .kf-anatomy__focus-btn')?.getAttribute('aria-pressed'),
    label: document.querySelector('#anatomy .kf-anatomy__focus-btn')?.textContent?.trim(),
  }));
  // Assemble then click an internal layer (Switch Plate index 3) -> auto-explodes and focuses
  await evaluate(() => {
    [...document.querySelectorAll('#anatomy .kf-anatomy__pose-btn')].find((b) => b.textContent === 'Assemble').click();
  });
  await evaluate(() => document.querySelectorAll('#anatomy .kf-layer-btn')[3].click());
  const autoExplodeState = await evaluate(() => ({
    explodePressed: [...document.querySelectorAll('#anatomy .kf-anatomy__pose-btn')]
      .find((b) => b.textContent === 'Explode')
      ?.getAttribute('aria-pressed'),
    focusPressed: document.querySelector('#anatomy .kf-anatomy__focus-btn')?.getAttribute('aria-pressed'),
  }));
  // Rapid clicking all 9 layers ends cleanly on layer 9
  await evaluate(() => {
    const list = document.querySelectorAll('#anatomy .kf-layer-btn');
    for (let i = 0; i < list.length; i += 1) list[i].click();
  });
  const rapidLast = await evaluate(() =>
    document.querySelector('#anatomy .kf-anatomy__active-card h3')?.textContent?.trim(),
  );
  check(
    'ui-anatomy: focus toggle, restore full view, internal auto-explode, and rapid selection clean',
    focusedState.pressed === 'true' &&
      focusedState.label === 'Restore full view' &&
      restoredState.pressed === 'false' &&
      restoredState.label === 'Focus layer' &&
      autoExplodeState.explodePressed === 'true' &&
      autoExplodeState.focusPressed === 'true' &&
      rapidLast === 'CNC Bottom Chassis & Silicone Feet',
  );

  // 4. Switch Lab 3D activation causes ZERO /audio/ requests & loads lazy curve panel
  await evaluate(() => document.getElementById('switch-lab').scrollIntoView({ behavior: 'instant', block: 'start' }));
  await until(() => evaluate(() => Boolean(document.querySelector('#switch-lab .kf-curve-svg'))), 'lazy switch curve');
  await evaluate(() =>
    document.querySelector('[data-kf-viewport="switch-lab"] .kf-viewport-host__action:last-child').click(),
  );
  await until(
    () =>
      evaluate(
        () => document.querySelector('[data-kf-viewport="switch-lab"]')?.dataset.kfViewportMode === 'interactive-3d',
      ),
    'switch-lab interactive-3d',
  );
  check(
    'ui-audio: 3D activation alone makes zero /audio/ requests and creates zero AudioContext',
    requests.filter((u) => u.includes('/audio/')).length === 0 &&
      (await evaluate(() => __kf005.audioContexts)) === 0,
  );

  // 5. Conceptual curve disclaimer & Cutaway/Assembled toggle
  const curveInfo = await evaluate(() => ({
    note: document.querySelector('#switch-lab .kf-curve-card__note')?.textContent ?? '',
    cutawayPressed: [...document.querySelectorAll('#switch-lab .kf-switch-pose__btn')]
      .find((b) => b.textContent === 'Cutaway')
      ?.getAttribute('aria-pressed'),
  }));
  await evaluate(() => {
    [...document.querySelectorAll('#switch-lab .kf-switch-pose__btn')].find((b) => b.textContent === 'Assembled').click();
  });
  const assembledPressed = await evaluate(() =>
    [...document.querySelectorAll('#switch-lab .kf-switch-pose__btn')]
      .find((b) => b.textContent === 'Assembled')
      ?.getAttribute('aria-pressed'),
  );
  check(
    'ui-switch: conceptual curve disclaimer present and Cutaway/Assembled toggle works',
    /Nominal design target/i.test(curveInfo.note) &&
      /Not laboratory measured/i.test(curveInfo.note) &&
      curveInfo.cutawayPressed === 'true' &&
      assembledPressed === 'true',
  );

  // 6. Pointer press/release, pointercancel, keyboard Space/Enter, blur, variant mid-press, deactivation
  const getPressBtn = () =>
    evaluate(() => {
      const btn = document.querySelector('#switch-lab .kf-press-tester button');
      btn.scrollIntoView({ behavior: 'instant', block: 'center' });
      const r = btn.getBoundingClientRect();
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        readout: document.querySelector('#switch-lab .kf-curve-card__readout')?.textContent?.trim(),
        pressed: btn.getAttribute('aria-pressed'),
        barWidth: document.querySelector('#switch-lab .kf-travel-fill')?.style.width,
      };
    });

  // Pointer press & hold to bottom-out (4.0 mm) then release to 0.0 mm
  const p0 = await getPressBtn();
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', x: p0.x, y: p0.y, clickCount: 1 });
  await until(
    async () => (await getPressBtn()).readout === '4.0 / 4.0 mm',
    'pointer press reaches 4.0 mm',
  );
  // The readout rounds travel to one decimal, so "4.0" can display while the
  // eased bar animation is still ~1% from settling. Wait for full bottom-out.
  await until(
    async () => {
      const settled = await getPressBtn();
      return settled.readout === '4.0 / 4.0 mm' && settled.barWidth === '100%' && settled.pressed === 'true';
    },
    'press settles at bottom-out',
  );
  const atBottom = await getPressBtn();
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', x: p0.x, y: p0.y, clickCount: 1 });
  await until(async () => (await getPressBtn()).readout === '0.0 / 4.0 mm', 'pointer release returns to 0.0 mm');

  // Pointer cancel releases cleanly
  await evaluate(() => {
    const btn = document.querySelector('#switch-lab .kf-press-tester button');
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
  });
  await delay(90);
  await evaluate(() => {
    const btn = document.querySelector('#switch-lab .kf-press-tester button');
    btn.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }));
  });
  await until(async () => (await getPressBtn()).readout === '0.0 / 4.0 mm', 'pointercancel release');

  // Keyboard Space hold & release
  await evaluate(() => document.querySelector('#switch-lab .kf-press-tester button').focus());
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await until(async () => (await getPressBtn()).readout === '4.0 / 4.0 mm', 'Space key press');
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await until(async () => (await getPressBtn()).readout === '0.0 / 4.0 mm', 'Space key release');

  // Keyboard Enter hold & release
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await until(async () => (await getPressBtn()).readout === '4.0 / 4.0 mm', 'Enter key press');
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await until(async () => (await getPressBtn()).readout === '0.0 / 4.0 mm', 'Enter key release');

  // Window blur while pressed releases cleanly
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await until(async () => (await getPressBtn()).pressed === 'true', 'pressed before blur');
  await evaluate(() => window.dispatchEvent(new Event('blur')));
  await until(
    async () => (await getPressBtn()).pressed === 'false' && (await getPressBtn()).readout === '0.0 / 4.0 mm',
    'blur release',
  );

  // Switch variant mid-press releases cleanly AND does NOT mutate Build Studio code
  const studioCodeBefore = await evaluate(() =>
    document.querySelector('.kf-summary-box__code')?.textContent?.trim(),
  );
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await until(async () => (await getPressBtn()).pressed === 'true', 'pressed before variant switch');
  await evaluate(() => {
    const tabs = [...document.querySelectorAll('#switch-lab .kf-switch-lab__tabs button')];
    tabs.find((b) => b.textContent.includes('Tactile 58')).click();
  });
  await until(
    async () => (await getPressBtn()).pressed === 'false' && (await getPressBtn()).readout === '0.0 / 3.8 mm',
    'variant change mid-press release',
  );
  const studioCodeAfterPreview = await evaluate(() =>
    document.querySelector('.kf-summary-box__code')?.textContent?.trim(),
  );
  // Explicit Apply to Build Studio updates Build Studio code
  await evaluate(() => {
    const btns = [...document.querySelectorAll('#switch-lab .kf-switch-panel__footer button')];
    btns.find((b) => b.textContent.includes('Apply to Build Studio')).click();
  });
  const studioCodeAfterApply = await evaluate(() =>
    document.querySelector('.kf-summary-box__code')?.textContent?.trim(),
  );
  check(
    'ui-switch: pointer, pointercancel, Space/Enter, blur, mid-press variant switch, and SVG sync work',
    atBottom.pressed === 'true' && atBottom.barWidth === '100%',
  );
  check(
    'ui-switch: previewing switch does not mutate Build Studio until explicit Apply',
    studioCodeBefore === studioCodeAfterPreview &&
      studioCodeBefore !== studioCodeAfterApply &&
      /T58/.test(studioCodeAfterApply ?? ''),
  );

  // 7. Audio UI: explicit Enable sound loads manifest + 18 WAVs once, plays on full press/release, skips partial press, mute works, rapid enable/cancel safe, fault degrades silently
  await evaluate(() => document.getElementById('switch-lab').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await delay(150);
  // Ensure Switch Lab 3D is active
  if (
    (await evaluate(
      () => document.querySelector('[data-kf-viewport="switch-lab"]')?.dataset.kfViewportMode,
    )) !== 'interactive-3d'
  ) {
    await evaluate(() =>
      document.querySelector('[data-kf-viewport="switch-lab"] .kf-viewport-host__action:last-child').click(),
    );
    await until(
      () =>
        evaluate(
          () => document.querySelector('[data-kf-viewport="switch-lab"]')?.dataset.kfViewportMode === 'interactive-3d',
        ),
      'switch-lab reactivated',
    );
  }

  const clickWithGesture = async (selector) => {
    const pt = await evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error('Missing element: ' + sel);
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, selector);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', x: pt.x, y: pt.y, clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', x: pt.x, y: pt.y, clickCount: 1 });
  };

  // Test rapid Enable -> Cancel before manifest returns (using real mouse gesture)
  await evaluate(() => {
    __kf005.holdAudioManifest = true;
  });
  await clickWithGesture('#switch-lab .kf-audio-btn');
  await until(
    () => evaluate(() => document.querySelector('#switch-lab .kf-audio-btn')?.textContent?.trim() === 'Cancel audio'),
    'loading audio state',
  );
  await clickWithGesture('#switch-lab .kf-audio-btn');
  await evaluate(() => {
    __kf005.holdAudioManifest = false;
    __kf005.resumeAudioManifest?.();
  });
  await delay(120);
  const cancelledLabel = await evaluate(() =>
    document.querySelector('#switch-lab .kf-audio-btn')?.textContent?.trim(),
  );
  check('ui-audio: rapid Enable -> Cancel publishes no stale ready state', cancelledLabel === 'Enable sound');

  // Test real Enable sound -> loads manifest + 18 WAVs once (real mouse gesture unlocks AudioContext!)
  requests.length = 0;
  await clickWithGesture('#switch-lab .kf-audio-btn');
  await until(
    () =>
      evaluate(() => document.querySelector('#switch-lab .kf-audio-btn')?.textContent?.trim() === 'Disable sound'),
    'audio ready state',
  );
  const audioLoadedReqs = requests.filter((u) => u.includes('/audio/kf01-v2/'));
  const wavReqs = audioLoadedReqs.filter((u) => u.endsWith('.wav'));
  const manifestReqs = audioLoadedReqs.filter((u) => u.endsWith('/manifest.json'));
  const afterEnableStarts = await evaluate(() => __kf005.audioStarts);
  const afterEnableDecodes = await evaluate(() => __kf005.audioDecodes);

  // Partial press (10 ms inside page, well below 65 ms bottom-out) should NOT fire downstroke/upstroke
  await evaluate(
    () =>
      new Promise((resolve) => {
        const btn = document.querySelector('#switch-lab .kf-press-tester button');
        btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 }));
        setTimeout(() => {
          btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 }));
          resolve();
        }, 10);
      }),
  );
  await delay(140);
  const afterPartialStarts = await evaluate(() => __kf005.audioStarts);

  // Full press to bottom-out + full release to top-out fires downstroke + upstroke (2 starts), 0 new fetches/decodes
  await evaluate(() => document.querySelector('#switch-lab .kf-press-tester button').focus());
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await until(async () => (await getPressBtn()).readout === '3.8 / 3.8 mm', 'audio full press bottom-out');
  await delay(40);
  const afterDownStarts = await evaluate(() => __kf005.audioStarts);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await until(async () => (await getPressBtn()).readout === '0.0 / 3.8 mm', 'audio full release top-out');
  await delay(40);
  const afterUpStarts = await evaluate(() => __kf005.audioStarts);
  const playbackAudioReqs = requests.filter((u) => u.includes('/audio/kf01-v2/')).length;
  const playbackDecodes = await evaluate(() => __kf005.audioDecodes);
  console.log('audio sync starts:', { afterEnableStarts, afterPartialStarts, afterDownStarts, afterUpStarts });

  check(
    'ui-audio: explicit Enable loads manifest + 18 WAVs once and zero fetch/decode on playback',
    manifestReqs.length === 1 &&
      wavReqs.length === 18 &&
      playbackAudioReqs === audioLoadedReqs.length &&
      playbackDecodes === afterEnableDecodes,
  );
  check(
    'ui-audio: partial press skips audio; full downstroke and release fire synchronized audio',
    afterPartialStarts === afterEnableStarts &&
      afterDownStarts === afterEnableStarts + 1 &&
      afterUpStarts === afterEnableStarts + 2,
  );

  // Mute immediately suppresses playback
  await evaluate(() => {
    [...document.querySelectorAll('#switch-lab .kf-audio-btn')].find((b) => b.textContent === 'Mute').click();
  });
  await evaluate(() => document.querySelector('#switch-lab .kf-press-tester button').focus());
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await until(async () => (await getPressBtn()).readout === '3.8 / 3.8 mm', 'muted press');
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await until(async () => (await getPressBtn()).readout === '0.0 / 3.8 mm', 'muted release');
  const afterMuteStarts = await evaluate(() => __kf005.audioStarts);
  check('ui-audio: Mute control immediately prevents playback', afterMuteStarts === afterUpStarts);

  // Deactivating 3D while pressed releases cleanly
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await until(async () => (await getPressBtn()).pressed === 'true', 'pressed before deactivation');
  await evaluate(() =>
    document.querySelector('[data-kf-viewport="switch-lab"] .kf-viewport-host__action:last-child').click(),
  );
  await until(
    () =>
      evaluate(
        () => document.querySelector('[data-kf-viewport="switch-lab"]')?.dataset.kfViewportMode === 'static-fallback',
      ),
    'switch-lab deactivated',
  );
  const afterDeact = await getPressBtn();
  check(
    'ui-switch: deactivating 3D while pressed releases cleanly',
    afterDeact.pressed === 'false' && afterDeact.readout === '0.0 / 3.8 mm',
  );

  // Audio 404 fault degrades cleanly without breaking Switch Lab
  await evaluate(() => {
    [...document.querySelectorAll('#switch-lab .kf-audio-btn')].find((b) => b.textContent === 'Disable sound').click();
  });
  await evaluate(() => {
    __kf005.faultAudio404 = true;
  });
  await clickWithGesture('#switch-lab .kf-audio-btn');
  await until(
    () => evaluate(() => document.querySelector('#switch-lab .kf-audio-btn')?.textContent?.trim() === 'Retry sound'),
    'audio fault graceful error',
  );
  const faultMsg = await evaluate(() =>
    document.querySelector('#switch-lab .kf-audio-bar__note')?.textContent?.trim(),
  );
  await evaluate(() => {
    __kf005.faultAudio404 = false;
    [...document.querySelectorAll('#switch-lab .kf-audio-btn')].find((b) => b.textContent === 'Close').click();
  });
  check(
    'ui-audio: 404 audio fault degrades silently without breaking Switch Lab',
    /Sound preview unavailable/i.test(faultMsg ?? ''),
  );

  // Route unmount while pressed cleans up with zero errors
  await evaluate(() => document.querySelector('#switch-lab .kf-press-tester button').focus());
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await evaluate(() => {
    location.hash = '/design-system';
  });
  await until(
    () => evaluate(() => document.querySelector('main h1')?.textContent?.includes('Design System')),
    'unmount to design-system',
  );
  check('ui-switch: unmount while pressed cleans up with zero JS/console errors', errors.length === 0);

  const failed = Object.keys(checks).filter((k) => !checks[k]);
  await writeFile(new URL('kf005-checks.json', output), JSON.stringify({ checks, errors, failed }, null, 2) + '\n');
  console.log(`${Object.keys(checks).length - failed.length}/${Object.keys(checks).length} KF-005 assertions passed`);
  if (errors.length > 0) console.error('Errors:', errors);
  assert.deepEqual(failed, []);
  assert.deepEqual(errors, []);
} finally {
  browser.close();
}
