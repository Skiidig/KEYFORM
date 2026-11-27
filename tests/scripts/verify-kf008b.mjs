import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { gzipSync } from 'node:zlib';
import { openRuntimeBrowser, until } from './runtime-browser.mjs';
import { initialProbe } from './runtime-probe.mjs';

const base = new URL(process.env.BASE_URL ?? 'http://127.0.0.1:4185/');
const output = new URL('../../.tmp/kf008b/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await openRuntimeBrowser();
const { send, on, evaluate, screenshot } = browser;
const anatomy = 'mechanical-anatomy';
const lab = 'switch-lab';
const studio = 'build-studio';
const anchors = { [anatomy]: 'anatomy', [lab]: lab, [studio]: studio };
const photo = 'static-fallback';
const live = 'interactive-3d';
const error = 'runtime-error';
const mutedAssets = /\/audio\/|SwitchLabAudioPanel-/i;
const coreAssets = /viewportAdapter-|\/assets\/kf01\/|\.glb(?:$|\?)/i;
const runtimeScripts = /\/(viewportLifecycle|viewportAdapter|buildConfigRuntime|digest)-.+\.js$/;
const eligibleProfile = { connection: { effectiveType: '4g', downlink: 10, saveData: false } };
const requests = new Map();
const errors = [];
const checks = [];
const evidence = {};
let sequence = 0;
let currentLoader;

const pass = (label) => { checks.push(label); console.log('PASS ' + label); };
const viewport = (width = 1440, height = 900, mobile = false) => send('Emulation.setDeviceMetricsOverride', {
  width, height, deviceScaleFactor: mobile ? 2 : 1, mobile,
});
const motion = (value = 'no-preference') => send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value }],
});
const navigate = async (anchor = '', profile = eligibleProfile) => {
  const url = new URL(base);
  url.searchParams.set('kf008b', ++sequence);
  url.hash = anchor;
  const { identifier } = await send('Page.addScriptToEvaluateOnNewDocument', {
    source: '(' + ((settings) => {
      if (settings.connection) {
        const connection = Object.assign(new EventTarget(), settings.connection);
        Object.defineProperty(navigator, 'connection', { value: connection });
      }
      if (settings.cores) Object.defineProperty(navigator, 'hardwareConcurrency', { value: settings.cores });
      if (settings.memory) Object.defineProperty(navigator, 'deviceMemory', { value: settings.memory });
      if (settings.unsupported) window.WebGL2RenderingContext = undefined;
    }).toString() + ')(' + JSON.stringify(profile) + ')',
  });
  const result = await send('Page.navigate', { url: url.href });
  assert.ok(!result.errorText, result.errorText);
  currentLoader = result.loaderId;
  await until(() => evaluate(async (href) => {
    if (location.href !== href || document.readyState !== 'complete' || document.querySelectorAll('[data-kf-viewport]').length !== 3) return false;
    await document.fonts.ready;
    return true;
  }, url.href), 'station mounts');
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
};

const scroll = (station) => evaluate((id) => {
  const target = id ? document.querySelector(`[data-kf-viewport="${id}"]`) : document.getElementById('hero');
  target.scrollIntoView({ block: 'center', behavior: 'instant' });
}, station ?? null);
const mode = (station) => evaluate((id) => document.querySelector(`[data-kf-viewport="${id}"]`)?.dataset.kfViewportMode, station);
const expectMode = (station, expected) => until(async () => {
  const actual = await mode(station);
  if (actual === error && expected !== error) {
    throw new Error(`${station}: ${await evaluate((id) => document.querySelector(`[data-kf-viewport="${id}"] [role=status]`)?.textContent, station)}`);
  }
  return actual === expected;
}, `${station} ${expected}`);
const stats = () => evaluate(() => ({
  active: runtimeProbe.active.size, max: runtimeProbe.max, created: runtimeProbe.created,
  automatic: runtimeProbe.automaticContexts, draws: runtimeProbe.draws, firstDraw: runtimeProbe.firstDraw,
  raf: runtimeProbe.raf.size, held: runtimeProbe.held, aborted: runtimeProbe.aborted,
  renderer: runtimeProbe.renderer, stageObservers: runtimeProbe.stageObservers.size,
  eligibilityListeners: runtimeProbe.eligibilityListeners.size, detached: runtimeProbe.readyWhileDetached,
  canvases: document.querySelectorAll('.kf-runtime-canvas').length,
}));
const trace = () => [...requests.values()].filter(({ loaderId }) => loaderId === currentLoader);
const models = () => trace().filter(({ path }) => coreAssets.test(path));
const size = async (pattern) => {
  const paths = [...new Set(trace().filter(({ type, path }) => type === 'Script' && pattern.test(path)).map(({ path }) => path))];
  const lengths = await Promise.all(paths.map(async (path) => {
    const raw = await readFile(new URL('../../dist' + path, import.meta.url));
    return { path, raw: raw.length, gzip9: gzipSync(raw, { level: 9 }).length };
  }));
  return { chunks: lengths, gzip9: lengths.reduce((sum, row) => sum + row.gzip9, 0) };
};
const click = (selector) => evaluate((sel) => document.querySelector(sel).click(), selector);
const toggle = (station) => click(`[data-kf-viewport="${station}"] .kf-viewport-host__action:last-child`);
const capture = async (name) => {
  await delay(300);
  await writeFile(new URL(`${name}.png`, output), await screenshot());
};
const center = (selector) => evaluate((sel) => {
  const el = document.querySelector(sel);
  el.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
}, selector);
const mouse = (type, point) => send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 });
const bounds = (station) => evaluate((id) => {
  const stage = document.querySelector(`[data-kf-viewport="${id}"]`);
  const { width, height } = stage.getBoundingClientRect();
  return [width, height];
}, station);
const assertOnlyOwner = async (station) => {
  const { active, canvases, max, detached } = await stats();
  assert.deepEqual([active, canvases, max, detached], [1, 1, 1, 0]);
  assert.equal(await evaluate(() => document.querySelector('.kf-runtime-canvas').closest('[data-kf-viewport]').dataset.kfViewport), station);
};

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: '(' + initialProbe.toString() + ')()' });
  on('Network.requestWillBeSent', ({ requestId, request, loaderId, type }) => {
    requests.set(requestId, { loaderId, type, path: new URL(request.url).pathname });
  });
  on('Network.loadingFinished', ({ requestId, encodedDataLength }) => {
    const request = requests.get(requestId);
    if (request) request.transferBytes = encodedDataLength;
  });
  on('Runtime.exceptionThrown', ({ exceptionDetails }) => errors.push(exceptionDetails.exception?.description ?? exceptionDetails.text));
  on('Runtime.consoleAPICalled', ({ type, args }) => {
    if (type === 'error') errors.push(args.map(({ value, description }) => value ?? description).join(' '));
  });

  await viewport();
  await motion();
  await navigate('', {});
  await delay(800);
  assert.deepEqual(models(), []);
  assert.ok(!trace().some(({ path }) => /viewportLifecycle-/.test(path) || mutedAssets.test(path)));
  assert.equal((await stats()).created, 0);
  evidence.hero = { ...(await size(/\.js$/)), requests: trace() };
  assert.equal(evidence.hero.chunks.length, 1);
  assert.ok(evidence.hero.gzip9 <= 90_000);
  pass('ordinary Hero requests one entry script and zero 3D or audio');

  // Chromium's network-quality estimate can fluctuate in a fresh headless profile.
  await navigate();
  for (const station of [anatomy, lab, studio]) {
    await scroll(station);
    await delay(85);
    await scroll();
  }
  await delay(650);
  assert.deepEqual(models(), []);
  assert.equal((await stats()).created, 0);
  pass('rapid scroll through all stations requests no runtime or model');

  const startedAt = await evaluate(() => performance.now());
  await scroll(anatomy);
  const photoSize = await bounds(anatomy);
  await delay(200);
  assert.equal(await mode(anatomy), photo);
  assert.deepEqual(models(), []);
  await expectMode(anatomy, live);
  const timing = await evaluate((start) => ({
    runtimeRequestedIn: performance.getEntriesByType('resource').find((entry) => entry.name.includes('viewportAdapter-')).startTime - start,
    readyIn: performance.now() - start,
  }), startedAt);
  assert.ok(timing.runtimeRequestedIn >= 500, `Anatomy requested the runtime after ${timing.runtimeRequestedIn} ms`);
  assert.deepEqual(await bounds(anatomy), photoSize);
  await assertOnlyOwner(anatomy);
  assert.equal(await evaluate(() => document.querySelector('#anatomy .kf-anatomy__pose-btn:nth-child(2)').ariaPressed), 'true');
  await capture('anatomy-desktop-auto');
  await evaluate(() => {
    const layer = document.getElementById('kf-anatomy-layer');
    layer.selectedIndex = 3;
    layer.dispatchEvent(new Event('change', { bubbles: true }));
  });
  evidence.dwell = { ...timing, stage: photoSize };
  pass('sustained visibility opens Exploded at stable stage dimensions');

  const orbit = await center('#anatomy .kf-runtime-canvas');
  await mouse('mousePressed', orbit);
  await scroll(lab);
  await delay(850);
  assert.equal(await mode(lab), photo);
  await assertOnlyOwner(anatomy);
  await mouse('mouseReleased', orbit);
  await expectMode(lab, live);
  assert.equal(await mode(anatomy), photo);
  await assertOnlyOwner(lab);
  assert.equal(await evaluate(() => document.querySelector('.kf-switch-lab__pose-btn').ariaPressed), 'true');
  await capture('switch-lab-desktop-auto');
  pass('held orbit prevents offscreen eviction, then Switch Lab opens in Cutaway');

  await click('[aria-label="Switch profile selector"] button:nth-child(2)');
  const press = await center('.kf-press-tester button');
  await mouse('mousePressed', press);
  await until(() => evaluate(() => document.querySelector('.kf-travel-fill').style.width === '100%'), 'switch bottom-out');
  assert.equal(await evaluate(() => document.querySelector('.kf-switch-lab__pose-btn:nth-child(2)').ariaPressed), 'true');
  await mouse('mouseReleased', press);
  await until(() => evaluate(() => document.querySelector('.kf-travel-fill').style.width === '0%'), 'switch release');
  assert.ok(!trace().some(({ path }) => mutedAssets.test(path)));
  await evaluate(() => Array.from(document.querySelectorAll('#switch-lab button')).find((button) => button.textContent.includes('Apply to Build Studio')).click());
  await scroll(studio);
  await expectMode(studio, live);
  await assertOnlyOwner(studio);
  assert.equal(await mode(lab), photo);
  const studioStart = await evaluate(() => ({
    camera: document.querySelector('#build-studio .kf-hud-btn[aria-pressed="true"]').textContent.trim(),
    code: document.querySelector('.kf-summary-box__code').textContent.trim(),
    closing: document.querySelector('.kf-closing__build-code strong').textContent.trim(),
  }));
  assert.equal(studioStart.camera, 'Studio ¾');
  assert.match(studioStart.code, /-T58-/);
  assert.equal(studioStart.code, studioStart.closing);
  await capture('build-studio-desktop-auto');
  await click('[aria-label="Enclosure finish"] [role="radio"]:last-child');
  await scroll(anatomy);
  await expectMode(anatomy, live);
  assert.equal(await evaluate(() => document.getElementById('kf-anatomy-layer').selectedIndex), 3);
  await scroll(lab);
  await expectMode(lab, live);
  assert.match(await evaluate(() => document.querySelector('[aria-label="Switch profile selector"] [aria-pressed="true"], [aria-label="Switch profile selector"] [aria-selected="true"]').textContent), /Tactile 58/);
  await scroll(studio);
  await expectMode(studio, live);
  assert.match(await evaluate(() => document.querySelector('.kf-summary-box__code').textContent), /-TIT-.*-T58-/);
  await assertOnlyOwner(studio);
  await delay(350);
  const settled = await stats();
  assert.equal(settled.automatic, 6);
  for (const station of [anatomy, lab, studio]) {
    assert.deepEqual(settled.firstDraw[station], { staticVisible: true, canvasHidden: true, reduced: false });
  }
  await delay(1500);
  assert.equal((await stats()).draws, settled.draws);
  assert.equal((await stats()).raf, 0);
  assert.ok(!trace().some(({ path }) => mutedAssets.test(path)));
  evidence.switching = { studioStart, settled, runtime: await size(runtimeScripts), requests: trace() };
  assert.ok(evidence.switching.runtime.gzip9 <= 220_000);
  pass('automatic handoffs preserve layer, switch travel, profile and build; first frame is covered and idle draws stay at zero');

  await scroll(lab);
  await expectMode(lab, live);
  await until(() => evaluate(() => document.querySelector('#switch-lab .kf-audio-btn')?.textContent.includes('Enable sound')), 'audio opt-in control');
  assert.ok(!trace().some(({ path }) => path.startsWith('/audio/')));
  const enableSound = await center('#switch-lab .kf-audio-btn');
  await mouse('mousePressed', enableSound);
  await mouse('mouseReleased', enableSound);
  await until(() => trace().some(({ path }) => /\/audio\/.*\.wav$/.test(path)), 'opt-in samples');
  pass('sound samples are requested only after explicit opt-in on an automatic station');

  await navigate();
  await evaluate(() => { runtimeProbe.holdDecode = true; });
  await scroll(studio);
  await until(() => evaluate(() => runtimeProbe.decoding), 'held automatic legend decode');
  assert.equal(await mode(studio), 'loading-runtime');
  await scroll(lab);
  await expectMode(lab, live);
  await evaluate(() => runtimeProbe.resumeDecode());
  await until(() => evaluate(() => runtimeProbe.decodedClosed), 'late decode disposed');
  assert.equal(await mode(studio), photo);
  assert.equal((await stats()).firstDraw[studio], undefined);
  await assertOnlyOwner(lab);
  await scroll();
  await expectMode(lab, photo);
  assert.deepEqual([(await stats()).active, (await stats()).stageObservers], [0, 0]);
  pass('leaving a pending load disposes late decode and publishes no stale 3D');

  await evaluate(() => { runtimeProbe.holdDecode = false; runtimeProbe.hold = 'exterior_b21'; });
  await scroll(studio);
  await until(async () => (await stats()).held === 1, 'held offscreen model fetch');
  await scroll();
  await until(async () => (await stats()).aborted === 1, 'offscreen fetch abort');
  assert.equal(await mode(studio), photo);
  await scroll(studio);
  await until(async () => (await stats()).held === 2, 'held model fetch');
  await toggle(anatomy);
  await until(async () => (await stats()).aborted === 2, 'manual takeover abort');
  await evaluate(() => { runtimeProbe.hold = ''; });
  await expectMode(anatomy, live);
  await delay(700);
  await assertOnlyOwner(anatomy);
  assert.equal(await mode(studio), photo);
  await scroll(anatomy);
  await toggle(anatomy);
  await expectMode(anatomy, photo);
  await delay(700);
  assert.equal(await mode(anatomy), photo);
  await toggle(anatomy);
  await expectMode(anatomy, live);
  await toggle(anatomy);
  await scroll();
  await scroll(anatomy);
  await delay(700);
  assert.equal(await mode(anatomy), photo);
  await evaluate(() => { location.hash = '/design-system'; });
  await until(() => evaluate(() => !document.querySelector('[data-kf-viewport]')), 'unmounted stations');
  await evaluate(() => { location.hash = ''; });
  await expectMode(anatomy, photo);
  await scroll(anatomy);
  await delay(700);
  assert.equal(await mode(anatomy), photo);
  pass('manual takeover aborts an automatic load, pins ownership, and Close suppresses automatic reopening');

  await viewport(1440, 2000);
  await navigate();
  const overlap = await evaluate((stations) => {
    const stages = stations.map((id) => document.querySelector(`[data-kf-viewport="${id}"]`));
    // One scroll puts both unmodified production stages in the viewport in the same frame.
    scrollTo({ top: scrollY + stages[0].getBoundingClientRect().top - 100, behavior: 'instant' });
    return stages.map((stage) => {
      const { top, bottom, height } = stage.getBoundingClientRect();
      return (Math.min(innerHeight, bottom) - Math.max(0, top)) / height;
    });
  }, [anatomy, lab]);
  assert.ok(overlap.every((ratio) => ratio >= 0.35), String(overlap));
  await expectMode(anatomy, live);
  await delay(700);
  assert.equal(await mode(lab), photo);
  assert.equal((await stats()).created, 1);
  assert.ok(!models().some(({ path }) => path.includes('hero_switch')));
  // The newest explicit request wins even if the earlier host still needs its lazy controller.
  await evaluate((stations) => {
    for (const id of stations) document.querySelector(`[data-kf-viewport="${id}"] .kf-viewport-host__action:last-child`).click();
  }, [studio, lab]);
  await expectMode(lab, live);
  await assertOnlyOwner(lab);
  assert.equal(await mode(studio), photo);
  assert.equal((await stats()).created, 2);
  evidence.overlap = { ratios: overlap, ownership: await stats() };
  pass('same-frame candidates arbitrate one lease and the latest explicit request wins');

  await viewport();
  await navigate();
  await evaluate(() => { runtimeProbe.fault = 'missing'; });
  await scroll(studio);
  await expectMode(studio, error);
  const failed = await stats();
  assert.deepEqual([failed.active, failed.canvases, failed.stageObservers], [0, 0, 0]);
  await scroll();
  await evaluate(() => { runtimeProbe.fault = ''; });
  await scroll(studio);
  await delay(700);
  assert.equal((await stats()).created, failed.created);
  assert.equal(await mode(studio), error);
  await toggle(studio);
  await expectMode(studio, live);
  await navigate();
  await scroll(studio);
  await expectMode(studio, live);
  await evaluate(() => [...runtimeProbe.active][0].getExtension('WEBGL_lose_context').loseContext());
  await expectMode(studio, error);
  await delay(700);
  assert.equal((await stats()).created, 1);
  assert.equal((await stats()).canvases, 0);
  await toggle(studio);
  await expectMode(studio, live);
  await evaluate(() => { location.hash = '/design-system'; });
  await until(() => evaluate(() => document.querySelector('[data-kf-viewport]') === null), 'design-system unmount');
  const disposed = await stats();
  assert.deepEqual([disposed.active, disposed.canvases, disposed.stageObservers, disposed.eligibilityListeners, disposed.raf], [0, 0, 0, 0, 0]);
  evidence.disposed = disposed;
  pass('asset failure and context loss suppress automatic retry, manual retry works and navigation disposes resources');

  for (const [label, profile] of [
    ['reduced motion', {}], ['Save-Data', { connection: { saveData: true } }],
    ['slow connection', { connection: { effectiveType: '3g', downlink: 0.8 } }],
    ['low-memory device', { memory: 4 }], ['no WebGL2', { unsupported: true }],
  ]) {
    await motion(label === 'reduced motion' ? 'reduce' : 'no-preference');
    await navigate('', profile);
    await scroll(studio);
    await delay(700);
    assert.equal(await mode(studio), photo, label);
    assert.deepEqual(models(), [], label);
    assert.equal((await stats()).created, 0, label);
    await toggle(studio);
    await expectMode(studio, label === 'Save-Data' || label === 'no WebGL2' ? error : live);
    pass(`${label} stays photographic and respects explicit runtime availability`);
  }

  await motion();
  await navigate('', { connection: { effectiveType: '4g', downlink: 10, saveData: false } });
  await evaluate(() => { runtimeProbe.hold = 'exterior_b21'; });
  await scroll(studio);
  await until(async () => (await stats()).held === 1, 'held request before live Save-Data change');
  await evaluate(() => {
    navigator.connection.saveData = true;
    navigator.connection.dispatchEvent(new Event('change'));
  });
  await until(async () => (await stats()).aborted === 1, 'fetch abort on live Save-Data change');
  await expectMode(studio, photo);
  await delay(700);
  assert.deepEqual([(await stats()).created, (await stats()).canvases], [1, 0]);
  pass('enabling Save-Data in the viewport cancels pending automatic work');

  await navigate();
  await scroll(studio);
  await delay(180);
  await viewport(1440, 100);
  await delay(650);
  assert.deepEqual(models(), []);
  await viewport();
  await scroll(studio);
  await expectMode(studio, live);
  pass('resizing below the threshold cancels dwell and qualifying again restarts it');

  evidence.directLinks = [];
  for (const mobile of [false, true]) {
    await viewport(mobile ? 390 : 1440, mobile ? 844 : 900, mobile);
    for (const [station, anchor] of Object.entries(anchors)) {
      await navigate(anchor);
      await expectMode(station, live);
      await assertOnlyOwner(station);
      assert.ok(!trace().some(({ path }) => mutedAssets.test(path)));
      const files = models().map(({ path }) => path);
      assert.equal((await stats()).automatic, 1);
      assert.equal(files.some((path) => path.includes('internal_b21')), station === anatomy);
      assert.equal(files.some((path) => path.includes('exterior_b21')), station !== lab);
      assert.equal(files.some((path) => path.includes('hero_switch_b21')), station === lab);
      assert.equal(files.some((path) => path.includes('legend-1024')), mobile && station !== lab);
      assert.equal(files.some((path) => path.includes('legend-2048')), !mobile && station !== lab);
      evidence.directLinks.push({ station, simulatedMobile: mobile, stage: await bounds(station), files });
      if (mobile) await capture(`${anchor}-mobile-auto`);
    }
    pass(`direct links activate every station on ${mobile ? 'simulated mobile' : 'desktop'}`);
  }

  assert.deepEqual(errors, []);
} finally {
  await writeFile(new URL('activation.json', output), JSON.stringify({ checks, evidence, errors }, null, 2) + '\n');
  browser.close();
}
