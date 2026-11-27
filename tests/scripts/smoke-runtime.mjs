import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { openRuntimeBrowser, until } from './runtime-browser.mjs';
import { initialProbe } from './runtime-probe.mjs';

const strict = process.argv.includes('--strict');
let url = process.env.BASE_URL ?? 'http://127.0.0.1:4185/';
let dev;
const output = new URL('../../.tmp/p1-evidence/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await openRuntimeBrowser();
const {send, evaluate, on, screenshot} = browser;
const stations = { studio: 'build-studio', anatomy: 'mechanical-anatomy', switches: 'switch-lab' };
const mode = (station) => evaluate((id) => document.querySelector('[data-kf-viewport="' + id + '"]')?.dataset.kfViewportMode, station);
const expectMode = (station, expected) => until(async () => {
  const actual = await mode(station);
  if (actual === 'runtime-error' && expected !== actual) {
    throw new Error('Unexpected fallback in ' + station + ': ' + await evaluate((id) =>
      document.querySelector('[data-kf-viewport="' + id + '"] [role=status]')?.textContent, station));
  }
  return actual === expected;
}, station + ' ' + expected);
const toggle = (station) => evaluate((id) => document.querySelector('[data-kf-viewport="' + id + '"] .kf-viewport-host__action:last-child').click(), station);
const stats = () => evaluate(() => ({
  active: runtimeProbe.active.size, max: runtimeProbe.max, draws: runtimeProbe.draws, raf: runtimeProbe.raf.size,
  canvases: document.querySelectorAll('.kf-runtime-canvas').length, renderer: runtimeProbe.renderer,
  firstDraw: runtimeProbe.firstDraw, held: runtimeProbe.held, aborted: runtimeProbe.aborted,
  detached: runtimeProbe.readyWhileDetached, mediaListeners: runtimeProbe.mediaListeners.size,
  stageObservers: runtimeProbe.stageObservers.size,
  eligibilityListeners: runtimeProbe.eligibilityListeners.size,
  decoding: runtimeProbe.decoding, decodedClosed: runtimeProbe.decodedClosed,
}));
const setFault = (fault) => evaluate((value) => { runtimeProbe.fault = value; }, fault);
const view = () => evaluate(() => runtimeProbe.views.get([...runtimeProbe.active][0]) ?? null);
const viewDistance = (a, b) => b ? Math.hypot(...a.map((value, i) => value - b[i])) : 0;
const waitForViewChange = (before, label) => until(async () => {
  const after = await view();
  return viewDistance(before, after) > 1e-4 && after;
}, label);
const selectStudioView = (index) => evaluate((position) => {
  document.querySelectorAll('#build-studio .kf-hud-btn')[position].click();
}, index);
const queueMotionAndExit = (exit) => evaluate((kind) => {
  const canvas = document.querySelector('#build-studio .kf-runtime-canvas');
  const gl = [...runtimeProbe.active][0];
  canvas.dispatchEvent(new KeyboardEvent('keydown', {code:'ArrowRight', shiftKey:true, bubbles:true, cancelable:true}));
  const queued = runtimeProbe.raf.size;
  runtimeProbe.retired = gl;
  runtimeProbe.retiredDraws = runtimeProbe.contextDraws.get(gl);
  if (kind === 'loss') {
    runtimeProbe.lossDelivered = false;
    // The extension delivers the event asynchronously. Measure after the stage has disposed.
    canvas.addEventListener('webglcontextlost', () => {
      runtimeProbe.retiredDraws = runtimeProbe.contextDraws.get(gl);
      runtimeProbe.lossDelivered = true;
    }, {once:true});
    gl.getExtension('WEBGL_lose_context').loseContext();
  } else {
    const station = kind === 'handoff' ? 'mechanical-anatomy' : 'build-studio';
    document.querySelector(`[data-kf-viewport="${station}"] .kf-viewport-host__action:last-child`).click();
  }
  return queued;
}, exit);
const assertRetiredIdle = async () => {
  await delay(120);
  assert.equal(await evaluate(() => runtimeProbe.contextDraws.get(runtimeProbe.retired)),
    await evaluate(() => runtimeProbe.retiredDraws));
};
const capture = async (station, file) => {
  if (strict) return;
  await evaluate((id) => document.querySelector('[data-kf-viewport="' + id + '"]').scrollIntoView({block:'center', behavior:'instant'}), station);
  await delay(300);
  await writeFile(new URL(file, output), await screenshot());
};

try {
  if (strict) {
    const {createServer} = await import('vite');
    dev = await createServer({server:{host:'127.0.0.1',port:4191,strictPort:true,watch:null}});
    await dev.listen();
    url = 'http://127.0.0.1:4191/';
  }
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', {width:1440, height:900, deviceScaleFactor:1, mobile:false});
  await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion', value:'reduce'}]});
  await send('Page.addScriptToEvaluateOnNewDocument', {source:'(' + initialProbe.toString() + ')(true)'});
  const requests = new Map();
  const errors = [];
  on('Network.requestWillBeSent', ({requestId,request}) => requests.set(requestId, {url: request.url}));
  on('Network.responseReceived', ({requestId,response}) => {
    const row = requests.get(requestId);
    if (row) Object.assign(row,{status:response.status,cache:response.fromDiskCache});
  });
  on('Network.loadingFinished', ({requestId,encodedDataLength}) => {
    const row = requests.get(requestId);
    if (row) row.transferBytes = encodedDataLength;
  });
  on('Runtime.exceptionThrown', ({exceptionDetails}) => errors.push(exceptionDetails.exception?.description ?? exceptionDetails.text));
  on('Runtime.consoleAPICalled', ({type,args}) => {
    if (type === 'error') errors.push(args.map(({value,description}) => value ?? description).join(' '));
  });

  const tests = [];
  const passed = (label) => { tests.push(label); console.log('PASS ' + label); };
  const trace = () => [...requests.values()].filter(({url}) => /\/assets\/kf01\/|viewportAdapter[-.]/.test(url));
  await send('Page.navigate', {url});
  await expectMode(stations.studio, 'static-fallback');
  const initial = await stats();
  assert.equal(initial.active, 0);
  assert.equal(initial.canvases, 0);
  assert.equal(trace().length, 0);
  passed('static visitor entry with zero 3D requests or contexts');
  await capture(stations.studio, 'studio-inactive.png');

  await evaluate(() => {
    Object.defineProperty(navigator, 'connection', {configurable:true, value:{saveData:true}});
  });
  await toggle(stations.studio);
  await expectMode(stations.studio, 'runtime-error');
  assert.equal(trace().length, 0);
  assert.equal((await stats()).active, 0);
  await evaluate(() => { delete navigator.connection; });
  passed('data saver stops before runtime import or fetch');

  await evaluate(() => { runtimeProbe.hold = 'legend-2048.json'; });
  await toggle(stations.studio);
  await until(async () => (await stats()).held >= 1, 'held legend');
  assert.equal(await mode(stations.studio), 'loading-runtime');
  assert.equal((await stats()).draws, 0);
  assert.ok(await evaluate(() => Boolean(document.querySelector('[data-kf-viewport="build-studio"] picture'))));
  await evaluate(() => {
    document.querySelector('[aria-label="Enclosure finish"] [role="radio"]:last-child').click();
    runtimeProbe.hold = '';
    runtimeProbe.resume();
  });
  await expectMode(stations.studio, 'interactive-3d');
  const ready = await stats();
  assert.equal(ready.active, 1);
  assert.equal(ready.canvases, 1);
  assert.deepEqual(ready.firstDraw[stations.studio], {staticVisible:true, canvasHidden:true, reduced:true});
  assert.match(ready.renderer, /RTX 4060/i);
  assert.match(await evaluate(() => document.querySelector('.kf-summary-box__code').textContent), /TIT/);
  const studio = trace();
  assert.equal(studio.filter(({url}) => url.includes('legend-2048.json')).length, 1);
  assert.equal(studio.filter(({url}) => url.includes('legends_b21_2048.png')).length, 1);
  assert.ok(studio.some(({url}) => url.includes('exterior_b21.meshopt')));
  assert.ok(!studio.some(({url}) => /internal_b21|hero_switch|encoder_macro/.test(url)));
  passed('first usable hidden frame, latest BuildConfig, reduced motion, and exterior-only activation');
  await capture(stations.studio, 'studio-active.png');
  const idle = await stats();
  await delay(850);
  assert.equal((await stats()).draws, idle.draws);
  assert.equal((await stats()).raf, 0);
  passed('zero continuous idle rendering');
  const defaultView = await view();
  assert.ok(defaultView, 'camera view matrix captured from the framebuffer pass');
  await evaluate(() => document.querySelector('.kf-runtime-canvas').focus());
  await send('Input.dispatchKeyEvent', {type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37,modifiers:8});
  await send('Input.dispatchKeyEvent', {type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37,modifiers:8});
  await until(async () => (await stats()).draws > idle.draws, 'keyboard orbit render');
  await waitForViewChange(defaultView, 'keyboard orbit pose');
  passed('keyboard orbit invalidates the active viewport');
  const afterOrbitDraws = (await stats()).draws;
  await evaluate(() => document.querySelector('[data-kf-viewport="build-studio"] [aria-label="Reset camera view"]').click());
  await until(async () => (await stats()).draws > afterOrbitDraws, 'camera reset render');
  await delay(150);
  const afterResetDraws = (await stats()).draws;
  await delay(400);
  assert.equal((await stats()).draws, afterResetDraws);
  assert.equal((await stats()).raf, 0);
  assert.ok(viewDistance(defaultView, await view()) < 1e-5);
  passed('camera reset restores framing and settles to zero idle frames');

  // KF-QUALITY-002C: Live motion lifecycle — pointer/touch/wheel damping, live reduced-motion snap, and 2s idle settle
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  const canvasBox = await evaluate(() => {
    const el = document.querySelector('#build-studio .kf-runtime-canvas');
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const drawsBeforeDrag = (await stats()).draws;
  const viewBeforeDrag = await view();
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', x: canvasBox.x, y: canvasBox.y, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', x: canvasBox.x + 64, y: canvasBox.y - 18, buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', x: canvasBox.x + 64, y: canvasBox.y - 18, clickCount: 1 });
  await waitForViewChange(viewBeforeDrag, 'pointer drag pose');
  await until(async () => (await stats()).raf === 0, 'pointer drag settles');
  const draggedView = await view();
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: canvasBox.x, y: canvasBox.y, deltaX: 0, deltaY: -80 });
  await waitForViewChange(draggedView, 'wheel zoom pose');
  await until(async () => (await stats()).draws > drawsBeforeDrag && (await stats()).raf === 0, 'orbit damping and wheel settle');
  const settledOrbitDraws = (await stats()).draws;
  await delay(2050);
  assert.equal((await stats()).draws, settledOrbitDraws);
  assert.equal((await stats()).raf, 0);
  // Start a Reset transition back from the dragged angle and toggle prefers-reduced-motion live mid-flight
  await evaluate(() => {
    document.querySelector('[data-kf-viewport="build-studio"] [aria-label="Reset camera view"]')?.click();
  });
  const zoomedView = await view();
  const movingView = await waitForViewChange(zoomedView, 'reset starts moving');
  assert.ok(viewDistance(defaultView, movingView) > 1e-4, 'reset is between its endpoints');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await until(async () => (await stats()).raf === 0 && viewDistance(defaultView, await view()) < 1e-5, 'live reduced-motion snap');
  passed('pointer orbit damping, wheel zoom, 2s zero-idle settle, and live reduced-motion snap');

  requests.clear();
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  assert.ok(await queueMotionAndExit('close'), 'Close during a queued stage frame');
  await expectMode(stations.studio, 'static-fallback');
  await assertRetiredIdle();
  await toggle(stations.studio);
  await expectMode(stations.studio, 'interactive-3d');
  assert.ok(await queueMotionAndExit('handoff'), 'handoff during a queued stage frame');
  await expectMode(stations.anatomy, 'interactive-3d');
  await assertRetiredIdle();
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await mode(stations.studio), 'static-fallback');
  assert.equal((await stats()).max, 1);
  const anatomy = trace();
  assert.ok(anatomy.some(({url}) => url.includes('internal_b21.meshopt')));
  await capture(stations.anatomy, 'anatomy-active.png');
  assert.equal(
    await evaluate(() => [...document.querySelectorAll('#anatomy button')].find((b) => b.textContent === 'Explode')?.getAttribute('aria-pressed')),
    'true',
  );
  await evaluate(() => {
    const button = [...document.querySelectorAll('#anatomy button')].find((button) => button.textContent === 'Assemble');
    button.click();
  });
  await until(() => evaluate(() => [...document.querySelectorAll('#anatomy button')].find((b) => b.textContent === 'Assemble')?.getAttribute('aria-pressed') === 'true'), 'assembly active state');
  await until(() => evaluate(() => [...document.querySelectorAll('#anatomy button')].some((button) => button.textContent === 'Explode')), 'assembly toggle');
  passed('serialized studio to anatomy handoff and assembly control');

  requests.clear();
  await toggle(stations.switches);
  await expectMode(stations.switches, 'interactive-3d');
  const switches = trace();
  assert.ok(switches.some(({url}) => url.includes('hero_switch_b21.reference')));
  assert.ok(!switches.some(({url}) => /exterior_b21|internal_b21|legend/.test(url)));
  await capture(stations.switches, 'switch-active.png');
  await toggle(stations.switches);
  await expectMode(stations.switches, 'static-fallback');
  passed('standalone switch partition and explicit deactivation');

  await evaluate(() => { runtimeProbe.hold = 'exterior_b21'; });
  await toggle(stations.studio);
  await until(async () => (await stats()).held === 2, 'held exterior');
  await toggle(stations.switches);
  await expectMode(stations.switches, 'interactive-3d');
  assert.equal(await mode(stations.studio), 'static-fallback');
  assert.equal((await stats()).aborted, 1);
  assert.equal((await stats()).detached, 0);
  assert.equal((await stats()).max, 1);
  await evaluate(() => { runtimeProbe.hold = ''; });
  passed('rapid handoff aborts obsolete transfer and publishes no stale frame');

  await evaluate(() => { runtimeProbe.holdDecode = true; });
  await toggle(stations.studio);
  await until(async () => (await stats()).decoding, 'GLTF image decode during load');
  await toggle(stations.switches);
  await expectMode(stations.switches, 'interactive-3d');
  await evaluate(() => {
    runtimeProbe.holdDecode = false;
    runtimeProbe.resumeDecode();
  });
  await until(async () => (await stats()).decodedClosed > 0, 'discarded GLTF image disposal');
  assert.equal(await mode(stations.studio), 'static-fallback');
  assert.equal((await stats()).max, 1);
  passed('late parsed geometry is discarded and its decoded image closed');

  await setFault('stage-observe');
  await toggle(stations.studio);
  await expectMode(stations.studio, 'runtime-error');
  const rolledBack = await stats();
  assert.deepEqual([rolledBack.stageObservers, rolledBack.mediaListeners, rolledBack.active, rolledBack.canvases, rolledBack.raf], [0, 0, 0, 0, 0]);
  await setFault('');
  await toggle(stations.studio);
  await expectMode(stations.studio, 'interactive-3d');
  await toggle(stations.studio);
  await expectMode(stations.studio, 'static-fallback');
  passed('partial stage setup rolls back after observation and manual retry succeeds');

  const failHeldInternal = async (duringMount, obsolete) => {
    const heldBefore = (await stats()).held;
    const failuresBefore = await evaluate(() => runtimeProbe.internalFailures);
    await evaluate(() => { runtimeProbe.hold = 'internal_b21'; });
    await selectStudioView(3);
    if (duringMount) await toggle(stations.studio);
    await until(async () => (await stats()).held > heldBefore, 'held internal model');
    await expectMode(stations.studio, duringMount ? 'loading-runtime' : 'interactive-3d');
    if (obsolete) await selectStudioView(0);
    await evaluate(() => {
      runtimeProbe.fault = 'internal';
      runtimeProbe.hold = '';
      runtimeProbe.resume();
    });
    await until(async () => await evaluate(() => runtimeProbe.internalFailures) > failuresBefore, 'internal model request failed');
    await expectMode(stations.studio, obsolete ? 'interactive-3d' : 'runtime-error');
    await delay(120);
    assert.equal(await mode(stations.studio), obsolete ? 'interactive-3d' : 'runtime-error');
    assert.equal((await stats()).active, obsolete ? 1 : 0);
    await setFault('');
  };
  await failHeldInternal(true, true);
  await failHeldInternal(false, true);
  await failHeldInternal(false, false);
  await failHeldInternal(true, false);
  await toggle(stations.studio);
  await expectMode(stations.studio, 'interactive-3d');
  await selectStudioView(0);
  await toggle(stations.studio);
  await expectMode(stations.studio, 'static-fallback');
  passed('stale internal rejection during mount and update preserves exterior; current rejection allows retry');

  for (const fault of ['missing','corrupt','html','renderer']) {
    await setFault(fault);
    await toggle(stations.studio);
    await expectMode(stations.studio, 'runtime-error');
    assert.equal((await stats()).active, 0, fault);
    assert.equal((await stats()).canvases, 0, fault);
    assert.ok(await evaluate(() => Boolean(document.querySelector('[data-kf-viewport="build-studio"] picture'))));
    passed(fault + ' failure rolls back lease and retains photography');
  }
  await setFault('');

  requests.clear();
  await toggle(stations.studio);
  await expectMode(stations.studio, 'interactive-3d');
  const remount = trace();
  if (!strict) {
    assert.ok(remount.some(({cache}) => cache), 'Versioned assets should reuse the HTTP cache');
    assert.equal(remount.reduce((total, row) => total + (row.transferBytes ?? 0), 0), 0);
    passed('repeat activation reuses cached asset bytes');
  }
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  assert.ok(await queueMotionAndExit('loss'), 'context loss during a queued stage frame');
  await expectMode(stations.studio, 'runtime-error');
  assert.ok(await evaluate(() => runtimeProbe.lossDelivered));
  await assertRetiredIdle();
  assert.equal((await stats()).raf, 0);
  assert.equal((await stats()).canvases, 0);
  await toggle(stations.studio);
  await expectMode(stations.studio, 'interactive-3d');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  passed('synthetic context loss releases resources and retry mounts a fresh lease');

  await evaluate(() => { location.hash = '/design-system'; });
  await until(() => evaluate(() => document.querySelector('main h1')?.textContent.includes('Design System & Brand Lab')), 'route unmount');
  const disposed = await stats();
  assert.deepEqual([disposed.active, disposed.canvases, disposed.raf, disposed.mediaListeners, disposed.detached, disposed.stageObservers], [0,0,0,0,0,0]);
  assert.equal(disposed.eligibilityListeners, 0);
  assert.equal(disposed.max, 1);
  assert.deepEqual(errors, []);
  passed('route unmount removes canvas, listeners and outstanding frame work');
  await evaluate(() => { location.hash = ''; });
  await expectMode(stations.studio, 'static-fallback');
  await send('Emulation.setDeviceMetricsOverride', {width:390, height:844, deviceScaleFactor:2, mobile:true});
  requests.clear();
  await toggle(stations.studio);
  await expectMode(stations.studio, 'interactive-3d');
  const narrow = trace();
  assert.ok(narrow.some(({url}) => url.includes('legend-1024.json')));
  assert.ok(!narrow.some(({url}) => url.includes('legend-2048.json')));
  assert.ok(await evaluate(() => {
    const canvas = document.querySelector('.kf-runtime-canvas');
    const expected = Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 1.25));
    return Math.abs(canvas.width - expected) <= 1;
  }));
  // Touch drag orbit damping & zero-idle settle on mobile viewport
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  const touchBox = await evaluate(() => {
    const el = document.querySelector('#build-studio .kf-runtime-canvas');
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  const drawsBeforeTouch = (await stats()).draws;
  const viewBeforeTouch = await view();
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchBox.x, y: touchBox.y, id: 1 }] });
  await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchBox.x + 48, y: touchBox.y - 12, id: 1 }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await waitForViewChange(viewBeforeTouch, 'touch orbit pose');
  await until(async () => (await stats()).draws > drawsBeforeTouch && (await stats()).raf === 0, 'touch orbit damping settle');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await capture(stations.studio, 'studio-mobile-active.png');
  await toggle(stations.studio);
  await expectMode(stations.studio, 'static-fallback');
  assert.equal((await stats()).active, 0);
  assert.equal((await stats()).mediaListeners, 0);
  passed('narrow viewport uses 1024 atlas and balanced DPR <= 1.25 after route remount');
  const evidence = { strict, tests, renderer: ready.renderer, viewport: [1440,900], dpr: 1, studio, anatomy, switches, remount, disposed, narrow, errors };
  await writeFile(new URL(strict ? 'lifecycle-strict.json' : 'lifecycle.json', output), JSON.stringify(evidence, null, 2) + '\n');
} finally {
  browser.close();
  await dev?.close();
}
