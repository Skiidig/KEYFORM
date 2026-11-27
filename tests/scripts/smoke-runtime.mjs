import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { openRuntimeBrowser, until } from './runtime-browser.mjs';

const strict = process.argv.includes('--strict');
let url = process.env.BASE_URL ?? 'http://127.0.0.1:4185/';
let dev;
const output = new URL('../../.tmp/p1-evidence/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await openRuntimeBrowser();
const {send, evaluate, on, screenshot} = browser;
const initialProbe = () => {
  const probe = globalThis.runtimeProbe = {
    active: new Set(), max: 0, draws: 0, raf: new Set(), firstDraw: {},
    fault: '', hold: '', held: 0, aborted: 0, readyWhileDetached: 0, renderer: '',
    mediaListeners: new Set(), holdDecode: false, decoding: false, decodedClosed: 0,
  };
  const request = window.requestAnimationFrame.bind(window);
  const cancel = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    const id = request((now) => { probe.raf.delete(id); callback(now); });
    probe.raf.add(id);
    return id;
  };
  window.cancelAnimationFrame = (id) => { probe.raf.delete(id); cancel(id); };
  const origMatch = window.matchMedia.bind(window);
  window.matchMedia = (query) => {
    const media = origMatch(query);
    if (query.includes('prefers-reduced-motion')) {
      const add = media.addEventListener.bind(media);
      const remove = media.removeEventListener.bind(media);
      media.addEventListener = (name, handler) => { probe.mediaListeners.add(handler); add(name, handler); };
      media.removeEventListener = (name, handler) => { probe.mediaListeners.delete(handler); remove(name, handler); };
    }
    return media;
  };
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, options) {
    if (type === 'webgl2' && probe.fault === 'renderer') return null;
    const gl = original.call(this, type, options);
    if (type !== 'webgl2' || !gl || probe.active.has(gl)) return gl;
    probe.active.add(gl);
    probe.max = Math.max(probe.max, probe.active.size);
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    probe.renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const loss = gl.getExtension('WEBGL_lose_context');
    if (loss) {
      const lose = loss.loseContext.bind(loss);
      loss.loseContext = () => { probe.active.delete(gl); lose(); };
    }
    let first = true;
    for (const method of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const native = gl[method].bind(gl);
      gl[method] = (...args) => {
        if (gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) === null) {
          probe.draws++;
          if (first) {
            first = false;
            const host = this.closest('[data-kf-viewport]');
            if (!host) probe.readyWhileDetached++;
            else probe.firstDraw[host.dataset.kfViewport] = {
              staticVisible: Boolean(host.querySelector('picture')),
              canvasHidden: getComputedStyle(this.parentElement).visibility === 'hidden',
              reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
            };
          }
        }
        return native(...args);
      };
    }
    return gl;
  };
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, options) => {
    const href = String(input);
    if (probe.hold && href.includes(probe.hold)) {
      probe.held++;
      await new Promise((resolve, reject) => {
        const abort = () => {
          probe.aborted++;
          reject(options.signal.reason);
        };
        probe.resume = () => {
          options?.signal?.removeEventListener('abort', abort);
          resolve();
        };
        options?.signal?.addEventListener('abort', abort, {once: true});
      });
    }
    if (probe.fault === 'missing' && href.includes('exterior_b21')) return new Response('', {status: 404});
    if (probe.fault === 'corrupt' && href.includes('legends_b21')) return new Response('invalid', {headers: {'Content-Type':'image/png'}});
    if (probe.fault === 'html' && href.endsWith('/manifest.json')) return new Response('<html>', {headers: {'Content-Type':'text/html'}});
    return nativeFetch(input, options);
  };
  const decode = window.createImageBitmap.bind(window);
  window.createImageBitmap = async (...args) => {
    if (!probe.holdDecode || args[0]?.size !== 40569) return decode(...args);
    probe.decoding = true;
    await new Promise((resolve) => { probe.resumeDecode = resolve; });
    const bitmap = await decode(...args);
    const close = bitmap.close.bind(bitmap);
    bitmap.close = () => { probe.decodedClosed++; close(); };
    return bitmap;
  };
};

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
  decoding: runtimeProbe.decoding, decodedClosed: runtimeProbe.decodedClosed,
}));
const setFault = (fault) => evaluate((value) => { runtimeProbe.fault = value; }, fault);
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
  await send('Page.addScriptToEvaluateOnNewDocument', {source:'(' + initialProbe.toString() + ')()'});
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
  await evaluate(() => document.querySelector('.kf-runtime-canvas').focus());
  await send('Input.dispatchKeyEvent', {type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37,modifiers:8});
  await send('Input.dispatchKeyEvent', {type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37,modifiers:8});
  await until(async () => (await stats()).draws > idle.draws, 'keyboard orbit render');
  passed('keyboard orbit invalidates the active viewport');
  const afterOrbitDraws = (await stats()).draws;
  await evaluate(() => document.querySelector('[data-kf-viewport="build-studio"] [aria-label="Reset camera view"]').click());
  await until(async () => (await stats()).draws > afterOrbitDraws, 'camera reset render');
  await delay(150);
  const afterResetDraws = (await stats()).draws;
  await delay(400);
  assert.equal((await stats()).draws, afterResetDraws);
  assert.equal((await stats()).raf, 0);
  passed('camera reset restores framing and settles to zero idle frames');

  requests.clear();
  await toggle(stations.anatomy);
  await expectMode(stations.anatomy, 'interactive-3d');
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
  await evaluate(() => {
    const gl = [...runtimeProbe.active][0];
    gl.getExtension('WEBGL_lose_context').loseContext();
  });
  await expectMode(stations.studio, 'runtime-error');
  assert.equal((await stats()).raf, 0);
  assert.equal((await stats()).canvases, 0);
  await toggle(stations.studio);
  await expectMode(stations.studio, 'interactive-3d');
  passed('synthetic context loss releases resources and retry mounts a fresh lease');

  await evaluate(() => { location.hash = '/design-system'; });
  await until(() => evaluate(() => document.querySelector('main h1')?.textContent.includes('Design System & Brand Lab')), 'route unmount');
  const disposed = await stats();
  assert.deepEqual([disposed.active, disposed.canvases, disposed.raf, disposed.mediaListeners, disposed.detached], [0,0,0,0,0]);
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
