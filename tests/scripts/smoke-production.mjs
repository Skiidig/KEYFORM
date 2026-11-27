// Adapted from the KF-004A-R2 promoted smoke test. Runs against the actual dist server.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../../', import.meta.url));
const url = new URL(process.env.BASE_URL ?? 'http://127.0.0.1:4185/');
const exe = process.env.EDGE_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const out = resolve(root, process.env.P0_EVIDENCE_DIR ?? '.tmp/p0-evidence');
const scratch = join(root, '.tmp');
await mkdir(scratch, { recursive: true });
await mkdir(out, { recursive: true });
const profile = await mkdtemp(join(scratch, 'edge-p0-'));
const edge = spawn(exe, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0',
  '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore', windowsHide: true });
let launchError;
edge.on('error', (error) => { launchError = error; });

async function waitFor(read, label) {
  for (let tries = 0; tries < 100; tries++) {
    if (launchError) throw launchError;
    const value = await read();
    if (value) return value;
    await delay(100);
  }
  throw new Error('Timed out waiting for ' + label);
}

let ws;
try {
  const debugPort = await waitFor(async () => {
    if (edge.exitCode !== null) throw new Error('Edge exited with code ' + edge.exitCode);
    try {
      return (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0].trim();
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }, 'Edge DevToolsActivePort');
  const cdp = 'http://127.0.0.1:' + debugPort;
  const targets = await (await fetch(cdp + '/json/list')).json();
  const target = targets.find(({type}) => type === 'page');
  assert.ok(target?.webSocketDebuggerUrl);
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ready, fail) => {
    ws.addEventListener('open', ready, { once: true });
    ws.addEventListener('error', fail, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener('message', ({data}) => {
    const message = JSON.parse(String(data));
    const command = pending.get(message.id);
    if (command) {
      pending.delete(message.id);
      if (message.error) command.reject(new Error(JSON.stringify(message.error)));
      else command.resolve(message.result);
    }
    for (const listener of listeners.get(message.method) ?? []) listener(message.params);
  });
  ws.addEventListener('close', () => {
    for (const {reject} of pending.values()) reject(new Error('DevTools connection closed'));
    pending.clear();
  });
  const on = (method, listener) => listeners.set(method, [...(listeners.get(method) ?? []), listener]);
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (fn, ...args) => {
    const expression = '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')';
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  const screenshot = async (name) => {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(out, name + '.png'), Buffer.from(shot.data, 'base64'));
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  const consoleErrors = [];
  const networkErrors = [];
  const requests = new Map();
  on('Runtime.consoleAPICalled', ({type, args}) => {
    if (type === 'error') consoleErrors.push(args.map((arg) => arg.value ?? arg.description).join(' '));
  });
  on('Runtime.exceptionThrown', ({exceptionDetails}) => consoleErrors.push(exceptionDetails.exception?.description ?? exceptionDetails.text));
  on('Network.requestWillBeSent', ({requestId, request, type, loaderId}) => {
    if (request.url.startsWith('http')) requests.set(requestId, { url: request.url, type, loaderId });
  });
  on('Network.responseReceived', ({requestId, response}) => {
    const row = requests.get(requestId);
    if (!row) return;
    Object.assign(row, { status: response.status, mimeType: response.mimeType });
    if (response.status >= 400) networkErrors.push(row.url + ' HTTP ' + response.status);
  });
  on('Network.loadingFinished', ({requestId, encodedDataLength}) => {
    const row = requests.get(requestId);
    if (row) row.transferBytes = encodedDataLength;
  });
  on('Network.loadingFailed', ({requestId, canceled, errorText}) => {
    const row = requests.get(requestId);
    if (row) row.canceled = Boolean(canceled);
    if (row && !canceled) networkErrors.push(row.url + ' ' + errorText);
  });

  const navigate = async () => {
    const result = await send('Page.navigate', { url: url.href });
    assert.ok(!result.errorText, result.errorText);
    await waitFor(() => evaluate(async () => {
      const img = document.querySelector('.kf-hero__img');
      if (!img?.complete || !img.naturalWidth || document.readyState !== 'complete') return false;
      await document.fonts.ready;
      return true;
    }), 'static visitor page');
    await delay(300);
    return result.loaderId;
  };
  const geometry = () => {
    const img = document.querySelector('.kf-hero__img');
    const cta = document.querySelector('.kf-hero__actions .kf-btn');
    const secondary = document.querySelector('.kf-hero__actions .kf-btn--secondary');
    const touch = (element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.height >= 44 && bounds.width >= 44;
    };
    const rail = document.querySelector('.kf-hero__datum dd');
    return {
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      heroRatio: img.clientWidth / img.clientHeight,
      heroObjectFit: getComputedStyle(img).objectFit,
      railBelowImage: document.querySelector('.kf-hero__rail').getBoundingClientRect().top >= img.getBoundingClientRect().bottom - 1,
      heroSpecCount: document.querySelectorAll('.kf-hero__datum').length,
      ctaTouchTargetsOk: touch(cta) && touch(secondary),
      heroRailValueText: rail.textContent.trim(),
      heroRailValueFont: getComputedStyle(rail).fontFamily.split(',')[0].replace(/['"]/g, ''),
      heroRailFinish: document.querySelector('.kf-hero__rail-finish').textContent.trim(),
      hero: new URL(img.currentSrc).pathname,
      sections: Array.from(document.querySelectorAll('main > section, main > footer'), (el) => el.id),
      lazyImages: document.querySelectorAll('img[loading="lazy"]').length,
      canvases: document.querySelectorAll('canvas').length,
    };
  };
  const defaultCode = 'KF01-FOR-CHR-MTC-L45-ALU';
  const dimensions = [
    ['desktop-1440', 1440, 900, 1, false], ['desktop-1024', 1024, 768, 1, false], ['tablet-768', 768, 1024, 2, true],
    ['mobile-440', 440, 956, 2, true], ['mobile-390', 390, 844, 2, true],
    ['mobile-320', 320, 568, 2, true],
  ];
  const device = ([, width, height, deviceScaleFactor, mobile]) =>
    send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile });
  const viewports = {};
  for (const spec of dimensions) {
    const [name, width] = spec;
    await device(spec);
    requests.clear();
    const loaderId = await navigate();
    const layout = await evaluate(geometry);
    const expected = 'OR01-provisional-desktop-hero';
    assert.equal(layout.overflowX, 0, name);
    assert.ok(layout.ctaTouchTargetsOk, name);
    assert.ok(layout.railBelowImage, name);
    assert.equal(layout.heroSpecCount, 4, name);
    if (width < 768) assert.ok(Math.abs(layout.heroRatio - 16 / 9) < 0.02, name);
    else assert.equal(layout.heroObjectFit, 'cover', name);
    assert.ok(layout.hero.includes(expected) && layout.hero.endsWith('.avif'), layout.hero);
    assert.deepEqual(layout.sections, ['hero', 'engineering', 'anatomy', 'switch-lab', 'materials', 'build-studio', 'closing']);
    assert.equal(layout.canvases, 0);
    assert.ok(layout.lazyImages > 0);
    const network = [...requests.values()].filter((row) => row.loaderId === loaderId);
    assert.ok(network.every(({url, mimeType}) => !/\/assets\/kf01\/|\.glb(?:$|\?)|meshopt|three(?:[.-]|\b)|\/audio\/|audio-engine|legend-\d/i.test(url) && !mimeType?.startsWith('audio/')));
    assert.ok(!network.some(({url}) => /A01-desktop-hero|H02-mobile-hero/.test(url)), 'Unexpected canonical hero preload');
    assert.ok(!network.some(({url}) => url.includes('A02-mobile-hero')), 'Obsolete A02 mobile hero requested');
    const heroes = network.filter(({url}) => url.includes(expected));
    assert.equal(heroes.length, 1, JSON.stringify({ name, heroes }));
    const scripts = network.filter(({type}) => type === 'Script');
    assert.equal(scripts.length, 1, 'Expected only the entry script: ' + scripts.map(({url}) => url).join(', '));
    assert.ok(/\/assets\/index-/.test(scripts[0]?.url ?? ''), 'Missing entry script');
    assert.ok(!network.some(({url}) => url.includes('DesignSystemPreview')), 'Expected lazy preview chunk');
    const images = network.filter(({type}) => type === 'Image');
    const heroTransfer = images.find(({url}) => new URL(url).pathname === layout.hero)?.transferBytes;
    assert.ok(heroTransfer > 0, name);
    const imageTransfer = images.reduce((total, row) => total + (row.transferBytes ?? 0), 0);
    viewports[name] = { ...layout, heroTransfer, imageTransfer, network };
    if (width === 1440 || width === 390) await screenshot(name);
  }

  const fallback = await evaluate(async () => {
    const img = document.querySelector('.kf-hero__img');
    for (const source of img.parentElement.querySelectorAll('source[type="image/avif"]')) source.remove();
    await img.decode();
    return new URL(img.currentSrc).pathname;
  });
  assert.match(fallback, /OR01-provisional-desktop-hero-.+\.webp$/);

  await device(dimensions[0]);
  await navigate();
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate(() => document.activeElement.getAttribute('href')), '#main-content');
  assert.equal(await evaluate(() => document.activeElement.matches(':focus-visible')), true);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  assert.equal(await evaluate(() => location.hash), '#main-content');

  const origin = url.origin;
  await send('Browser.grantPermissions', { origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
  const interactive = await evaluate(async () => {
    const frame = () => new Promise((ready) => requestAnimationFrame(() => requestAnimationFrame(ready)));
    const studio = document.getElementById('build-studio');
    const code = () => studio.querySelector('.kf-summary-box__code').textContent.trim();
    const image = () => studio.querySelector('.kf-viewport__img');
    const match = () => studio.querySelector('[data-kf-viewport]').dataset.kfPreviewMatch;
    const button = (parent, label) => Array.from(parent.querySelectorAll('button')).find((el) => el.textContent.trim().includes(label));
    studio.scrollIntoView({ behavior: 'instant' });
    const defaultBuildCode = code();
    const enclosures = {};
    for (const radio of studio.querySelectorAll('[aria-label="Enclosure finish"] [role="radio"]')) {
      radio.click();
      await frame();
      await image().decode();
      enclosures[radio.textContent.trim()] = { code: code(), source: image().currentSrc, match: match() };
    }
    button(studio, 'Keycaps').click();
    await frame();
    studio.querySelector('[aria-label="Escape key"] [role="radio"]:nth-of-type(2)').click();
    await frame();
    const partial = match();
    button(studio, 'Rear').click();
    await frame();
    const reference = match();
    const lab = document.getElementById('switch-lab');
    button(lab, 'Tactile 58').click();
    await frame();
    button(lab, 'Apply to Build Studio').click();
    await frame();
    const codeAfterSync = code();
    const closingCode = document.querySelector('.kf-closing__build-code strong').textContent.trim();
    button(studio, 'Copy Build Summary').click();
    await frame();
    const clipboard = await navigator.clipboard.readText();
    const copyFeedback = studio.querySelector('.kf-studio-feedback')?.textContent;
    button(studio, 'Reset').click();
    await frame();
    return {
      defaultBuildCode, enclosures, partial, reference, codeAfterSync, closingCode, clipboard, copyFeedback,
      codeAfterReset: code(),
      viewports: Array.from(document.querySelectorAll('[data-kf-viewport]'), (el) => [el.dataset.kfViewport, el.dataset.kfViewportMode]),
    };
  });
  assert.equal(interactive.defaultBuildCode, defaultCode);
  assert.equal(interactive.codeAfterReset, defaultCode);
  assert.match(interactive.codeAfterSync, /-T58-/);
  assert.equal(interactive.closingCode, interactive.codeAfterSync);
  assert.ok(interactive.clipboard.includes('Build Code: ' + interactive.codeAfterSync));
  assert.ok(interactive.copyFeedback?.includes(interactive.codeAfterSync));
  assert.equal(interactive.partial, 'partial');
  assert.equal(interactive.reference, 'reference');
  for (const [finish, shot] of [['Forest', 'A03'], ['Obsidian', 'B01'], ['Carbon', 'B02'], ['Titanium', 'B03']]) {
    assert.ok(interactive.enclosures[finish].source.includes('/' + shot + '-'));
    assert.equal(interactive.enclosures[finish].match, 'matched');
  }
  assert.deepEqual(interactive.viewports, ['mechanical-anatomy', 'switch-lab', 'build-studio'].map((id) => [id, 'static-fallback']));

  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const reducedMotion = await evaluate(() => ({
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    revealTransition: getComputedStyle(document.querySelector('.kf-reveal')).transitionDuration,
    revealTransform: getComputedStyle(document.querySelector('.kf-reveal')).transform,
    revealOpacity: getComputedStyle(document.querySelector('.kf-reveal')).opacity,
    previewAnimation: getComputedStyle(document.querySelector('.kf-viewport-host__img')).animationName,
  }));
  assert.equal(reducedMotion.reduced, true);
  assert.ok(reducedMotion.revealTransition.split(',').every((time) => Number.parseFloat(time) <= 0.00001));
  assert.equal(reducedMotion.revealTransform, 'none');
  assert.equal(reducedMotion.revealOpacity, '1');
  assert.equal(reducedMotion.previewAnimation, 'none');
  await evaluate(() => { location.hash = '/design-system'; });
  await waitFor(() => evaluate(() => document.querySelector('main h1')?.textContent.includes('Design System & Brand Lab')), 'lazy design-system preview');
  assert.ok([...requests.values()].some(({url}) => url.includes('DesignSystemPreview')));
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(networkErrors, []);

  const summary = { url: url.href, viewports, fallback, interactive, reducedMotion, consoleErrors, networkErrors };
  await writeFile(join(out, 'browser.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log('Verified six responsive viewports, static-first network traces, design system, and Build Studio behavior.');
  console.log('Hero / all initial image transfer in bytes (CDP wire counts):');
  console.table(Object.fromEntries(Object.entries(viewports).map(([name, {heroTransfer, imageTransfer}]) => [name, {heroTransfer, imageTransfer}])));
} finally {
  ws?.close();
  edge.kill();
}
