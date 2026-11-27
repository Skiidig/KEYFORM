import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { openRuntimeBrowser, until } from './runtime-browser.mjs';

const url = process.env.BASE_URL ?? 'http://127.0.0.1:4185/';
const output = new URL('../../.tmp/kf006a-evidence/', import.meta.url);
await mkdir(output, { recursive: true });

// Compile deep KF-006A runtime fixture in memory (outside production bundle graph)
const built = await build({
  configFile: false,
  publicDir: false,
  logLevel: 'error',
  build: {
    minify: true,
    write: false,
    lib: {
      entry: fileURLToPath(new URL('../kf006a-fixture.ts', import.meta.url)),
      name: 'KeyformKF006AFixture',
      formats: ['iife'],
    },
  },
});
const fixtureCode = (Array.isArray(built) ? built[0] : built).output.find(({ type }) => type === 'chunk').code;

const browser = await openRuntimeBrowser();
const { send, evaluate, on, screenshot } = browser;

const probeScript = () => {
  const probe = (globalThis.__kf006a = {
    contextsCreated: 0,
    activeContexts: new Set(),
    draws: 0,
    raf: new Set(),
    renderer: '',
    holdAsset: '',
    heldCount: 0,
    resumeAsset: null,
  });
  const req = window.requestAnimationFrame.bind(window);
  const cancel = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => {
    const id = req((t) => {
      probe.raf.delete(id);
      cb(t);
    });
    probe.raf.add(id);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    probe.raf.delete(id);
    cancel(id);
  };
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, opts) {
    const gl = origGetContext.call(this, type, opts);
    if (type !== 'webgl2' || !gl || probe.activeContexts.has(gl)) return gl;
    probe.contextsCreated += 1;
    probe.activeContexts.add(gl);
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    probe.renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const loseExt = gl.getExtension('WEBGL_lose_context');
    if (loseExt) {
      const lose = loseExt.loseContext.bind(loseExt);
      loseExt.loseContext = () => {
        probe.activeContexts.delete(gl);
        lose();
      };
    }
    for (const m of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const native = gl[m].bind(gl);
      gl[m] = (...args) => {
        if (gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) === null) probe.draws += 1;
        return native(...args);
      };
    }
    return gl;
  };
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const href = String(input);
    if (probe.holdAsset && href.includes(probe.holdAsset)) {
      probe.heldCount += 1;
      await new Promise((resolve, reject) => {
        const onAbort = () => reject(init?.signal?.reason ?? new DOMException('Aborted', 'AbortError'));
        probe.resumeAsset = () => {
          init?.signal?.removeEventListener('abort', onAbort);
          resolve();
        };
        init?.signal?.addEventListener('abort', onAbort, { once: true });
      });
    }
    return origFetch(input, init);
  };
};

const checks = {};
const check = (name, ok) => {
  checks[name] = Boolean(ok);
  console.log((ok ? 'PASS ' : 'FAIL ') + name);
};

async function composeContactSheet(filename, title, tiles, cols = 2) {
  const encoded = [];
  for (const tile of tiles) {
    const buf = await readFile(new URL(tile.file, output));
    encoded.push({ label: tile.label, src: 'data:image/png;base64,' + buf.toString('base64') });
  }
  const dataUrl = await evaluate(
    async ({ title, items, cols }) => {
      const imgs = await Promise.all(
        items.map(
          (item) =>
            new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve({ label: item.label, img });
              img.onerror = reject;
              img.src = item.src;
            }),
        ),
      );
      const tileW = 680;
      const tileH = Math.round((imgs[0].img.height / imgs[0].img.width) * tileW);
      const pad = 20;
      const headerH = 52;
      const captionH = 30;
      const rows = Math.ceil(imgs.length / cols);
      const canvas = document.createElement('canvas');
      canvas.width = pad + cols * (tileW + pad);
      canvas.height = headerH + pad + rows * (tileH + captionH + pad);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0D100F';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#F2EFE6';
      ctx.font = '600 20px Manrope, system-ui, sans-serif';
      ctx.fillText(title, pad, 34);
      imgs.forEach(({ label, img }, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const x = pad + c * (tileW + pad);
        const y = headerH + pad + r * (tileH + captionH + pad);
        ctx.drawImage(img, x, y, tileW, tileH);
        ctx.strokeStyle = 'rgba(242,239,230,0.22)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, tileW - 1, tileH - 1);
        ctx.fillStyle = '#CBD1C8';
        ctx.font = '500 13px "IBM Plex Mono", monospace';
        ctx.fillText(label, x, y + tileH + 20);
      });
      return canvas.toDataURL('image/png');
    },
    { title, items: encoded, cols },
  );
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  await writeFile(new URL(filename, output), Buffer.from(base64, 'base64'));
}

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
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

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

  // --- Part A: Deep runtime material, grouping, precedence, contrast, tier & isolation checks ---
  await send('Page.navigate', { url });
  await until(() => evaluate(() => Boolean(document.querySelector('[data-kf-viewport="build-studio"]'))), 'initial boot');
  const injected = await send('Runtime.evaluate', { expression: fixtureCode });
  assert.equal(injected.exceptionDetails, undefined, JSON.stringify(injected.exceptionDetails));
  const rtRes = await send('Runtime.evaluate', {
    expression: 'kf006aFixture.runRuntimeChecks()',
    returnByValue: true,
    awaitPromise: true,
  });
  assert.equal(rtRes.exceptionDetails, undefined, JSON.stringify(rtRes.exceptionDetails));
  const { checks: runtimeChecks, details: runtimeDetails } = rtRes.result.value;
  for (const [k, v] of Object.entries(runtimeChecks)) check(k, v);

  // --- Part B: End-to-end production Build Studio browser checks + visual evidence capture ---
  requests.length = 0;
  await send('Page.addScriptToEvaluateOnNewDocument', { source: '(' + probeScript.toString() + ')()' });
  await send('Browser.grantPermissions', {
    origin: new URL(url).origin,
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
  });
  await send('Page.navigate', { url });
  await until(() => evaluate(() => Boolean(document.querySelector('[data-kf-viewport="build-studio"]'))), 'ui boot');
  await delay(200);

  const studioMode = () =>
    evaluate(() => document.querySelector('[data-kf-viewport="build-studio"]')?.dataset.kfViewportMode);
  const waitStudioMode = (expected) => until(async () => (await studioMode()) === expected, 'studio ' + expected);
  const toggleStudio = () =>
    evaluate(() =>
      document.querySelector('[data-kf-viewport="build-studio"] .kf-viewport-host__action:last-child').click(),
    );
  const clickStudioTab = (label) =>
    evaluate((name) => {
      const btn = [...document.querySelectorAll('#build-studio [aria-label="Build Studio configuration category"] button')]
        .find((b) => b.textContent.trim() === name);
      if (!btn) throw new Error('Missing tab: ' + name);
      btn.click();
    }, label);
  const clickRadio = (groupLabel, optionName) =>
    evaluate(
      ({ g, o }) => {
        const radio = [...document.querySelectorAll(`#build-studio [aria-label="${g}"] [role="radio"]`)]
          .find((el) => el.textContent.trim().includes(o));
        if (!radio) throw new Error(`Missing radio ${g} / ${o}`);
        radio.click();
      },
      { g: groupLabel, o: optionName },
    );
  const clickSwitchChoice = (name) =>
    evaluate((label) => {
      const btn = [...document.querySelectorAll('#build-studio [aria-label="Build Studio switch profile"] button')]
        .find((b) => b.textContent.trim() === label);
      if (!btn) throw new Error('Missing switch choice: ' + label);
      btn.click();
    }, name);
  const clickCamera = (label) =>
    evaluate((name) => {
      const btn = [...document.querySelectorAll('#build-studio .kf-hud-angles button')]
        .find((b) => b.textContent.trim() === name);
      if (!btn) throw new Error('Missing camera: ' + name);
      btn.click();
    }, label);
  const studioSummary = () =>
    evaluate(() => ({
      code: document.querySelector('#build-studio .kf-summary-box__code')?.textContent?.trim(),
      closingCode: document.querySelector('.kf-closing__build-code strong')?.textContent?.trim(),
      dlText: document.querySelector('#build-studio .kf-summary-dl')?.textContent?.replace(/\s+/g, ' ').trim(),
      note: document.querySelector('#build-studio .kf-viewport__note')?.textContent?.replace(/\s+/g, ' ').trim(),
      match: document.querySelector('[data-kf-viewport="build-studio"]')?.dataset.kfPreviewMatch,
    }));
  const captureStudio = async (file) => {
    await evaluate(() => document.getElementById('build-studio').scrollIntoView({ behavior: 'instant', block: 'start' }));
    await delay(220);
    await writeFile(new URL(file, output), await screenshot());
  };

  // Static fallback: partial disclosure, configuration retention, Reset in static fallback
  await clickStudioTab('Keycaps');
  await clickRadio('Keycap set (1.5 mm PBT)', 'Porcelain PBT');
  await clickRadio('Escape key', 'Brass Accent');
  const staticPartial = await studioSummary();
  await evaluate(() => {
    [...document.querySelectorAll('#build-studio .kf-studio-actions button')]
      .find((b) => b.textContent.trim() === 'Reset')
      .click();
  });
  const staticReset = await studioSummary();
  check(
    'ui: static fallback distinguishes photography from spec and Reset restores canonical default',
    staticPartial.match === 'partial' &&
      staticPartial.code === 'KF01-FOR-PRC-BRS-L45-ALU' &&
      staticPartial.closingCode === 'KF01-FOR-PRC-BRS-L45-ALU' &&
      /Open 3D/i.test(staticPartial.note) &&
      staticReset.code === 'KF01-FOR-CHR-MTC-L45-ALU' &&
      staticReset.match === 'matched',
  );

  // Activate Build Studio 3D -> verify lazy buildConfigRuntime chunk, zero internal GLB, zero audio
  requests.length = 0;
  await toggleStudio();
  await waitStudioMode('interactive-3d');
  const initReqs = [...requests];
  const hasLazyConfigChunk = initReqs.some((u) => /buildConfigRuntime[-.]/.test(u));
  const hasInternalInit = initReqs.some((u) => /internal_b21/.test(u));
  const hasAudioInit = initReqs.some((u) => /\/audio\//.test(u));
  const probeInit = await evaluate(() => ({
    contexts: __kf006a.contextsCreated,
    active: __kf006a.activeContexts.size,
    renderer: __kf006a.renderer,
  }));
  check(
    'ui: Build Studio 3D loads lazy buildConfigRuntime chunk with 0 internal GLB and 0 audio requests',
    hasLazyConfigChunk && !hasInternalInit && !hasAudioInit && probeInit.contexts === 1,
  );

  // Capture default Forest / Charcoal / Matched
  await captureStudio('01-default-forest-charcoal.png');

  // Change keycap sets, accents, enclosures -> verify 0 renderer recreations, 0 model reloads, 0 internal fetches
  const reqCountBeforeExteriorEdits = requests.length;
  const drawsBeforeOrbit = await evaluate(() => __kf006a.draws);
  // Orbit camera slightly via keyboard to prove material updates preserve camera orientation
  await evaluate(() => document.querySelector('#build-studio .kf-runtime-canvas').focus());
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, modifiers: 8 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, modifiers: 8 });
  await until(async () => (await evaluate(() => __kf006a.draws)) > drawsBeforeOrbit, 'orbit frame');

  // Reset camera to canonical Studio 3/4 for clean visual evidence shots
  await evaluate(() => document.querySelector('[data-kf-viewport="build-studio"] [aria-label="Reset camera view"]').click());
  await delay(120);

  // Verify Matched Escape swatch dynamically follows selected base keycap set (Porcelain #c2beb2 & Slate #434a46)
  await clickStudioTab('Keycaps');
  await clickRadio('Keycap set (1.5 mm PBT)', 'Porcelain PBT');
  await captureStudio('02-forest-porcelain.png');
  const porcelainMatchedChip = await evaluate(() =>
    getComputedStyle(document.querySelector('#build-studio [aria-label="Escape key"] [role="radio"] .kf-swatch__chip')).backgroundColor,
  );

  // Two-Tone Slate
  await clickRadio('Keycap set (1.5 mm PBT)', 'Two-Tone Slate');
  await captureStudio('03-forest-twotone-slate.png');
  const slateMatchedChip = await evaluate(() =>
    getComputedStyle(document.querySelector('#build-studio [aria-label="Escape key"] [role="radio"] .kf-swatch__chip')).backgroundColor,
  );

  // Enclosure + keycap combinations
  await clickStudioTab('Exterior');
  await clickRadio('Enclosure finish', 'Titanium');
  await captureStudio('04-titanium-twotone-slate.png');

  await clickRadio('Enclosure finish', 'Obsidian');
  await clickStudioTab('Keycaps');
  await clickRadio('Keycap set (1.5 mm PBT)', 'Porcelain PBT');
  await captureStudio('05-obsidian-porcelain.png');

  // Escape accents evidence (Matched, Ivory, Forest, Brass)
  await clickStudioTab('Exterior');
  await clickRadio('Enclosure finish', 'Forest');
  await clickStudioTab('Keycaps');
  await clickRadio('Keycap set (1.5 mm PBT)', 'Charcoal PBT');
  await clickRadio('Escape key', 'Matched');
  await captureStudio('06-accent-matched.png');

  await clickRadio('Escape key', 'Ivory Esc');
  await captureStudio('07-accent-ivory.png');

  await clickRadio('Keycap set (1.5 mm PBT)', 'Porcelain PBT');
  await clickRadio('Escape key', 'Forest Esc');
  await captureStudio('08-accent-forest.png');

  await clickRadio('Keycap set (1.5 mm PBT)', 'Charcoal PBT');
  await clickRadio('Escape key', 'Brass Accent');
  await captureStudio('09-accent-brass.png');

  // Change Switch & Plate while still in exterior-only view -> must NOT fetch internal GLB!
  await clickStudioTab('Internals');
  await clickSwitchChoice('Tactile 58');
  await clickRadio('Switch plate (1.50 mm)', 'Sandblasted Brass');
  await delay(150);
  const newReqsDuringExteriorEdits = requests.slice(reqCountBeforeExteriorEdits);
  const contextsAfterExteriorEdits = await evaluate(() => __kf006a.contextsCreated);
  const summarySync = await studioSummary();
  check(
    'ui: material edits do not recreate renderer, reload models, or fetch internal partition in exterior view',
    contextsAfterExteriorEdits === 1 &&
      !newReqsDuringExteriorEdits.some((u) => /\/assets\/kf01\/|\.glb/.test(u)) &&
      summarySync.code === 'KF01-FOR-CHR-BRS-T58-BRS' &&
      summarySync.closingCode === 'KF01-FOR-CHR-BRS-T58-BRS' &&
      /Forest/.test(summarySync.dlText ?? '') &&
      /Charcoal PBT/.test(summarySync.dlText ?? '') &&
      /Brass Accent/.test(summarySync.dlText ?? '') &&
      /Sandblasted Brass/.test(summarySync.dlText ?? '') &&
      porcelainMatchedChip === 'rgb(194, 190, 178)' &&
      slateMatchedChip === 'rgb(67, 74, 70)',
  );

  // Copy Build Summary writes current active build code
  await evaluate(() => {
    [...document.querySelectorAll('#build-studio .kf-studio-actions button')]
      .find((b) => b.textContent.trim() === 'Copy Build Summary')
      .click();
  });
  await delay(100);
  const copied = await evaluate(() => navigator.clipboard.readText());
  check(
    'ui: Copy Build Summary uses current live build configuration',
    copied.includes('Build Code: KF01-FOR-CHR-BRS-T58-BRS') &&
      copied.includes('Sandblasted Brass') &&
      copied.includes('KF—Tactile 58'),
  );

  // Open Exploded view -> fetches internal GLB ONCE, shows Tactile 58 + Brass plate
  await clickCamera('Exploded');
  await until(() => requests.some((u) => /internal_b21/.test(u)), 'internal partition load');
  await delay(350);
  await captureStudio('10-internal-tactile58-brass.png');

  // Capture remaining switch profiles + plate materials in Exploded view
  await clickSwitchChoice('Linear 45');
  await clickRadio('Switch plate (1.50 mm)', 'Brushed Aluminium');
  await captureStudio('11-internal-linear45-aluminium.png');

  await clickSwitchChoice('Tactile 58');
  await clickRadio('Switch plate (1.50 mm)', 'Matte FR4');
  await captureStudio('12-internal-tactile58-fr4.png');

  await clickSwitchChoice('Silent 50');
  await clickRadio('Switch plate (1.50 mm)', 'Polycarbonate');
  await captureStudio('13-internal-silent50-polycarbonate.png');

  // Zero continuous idle frames after material updates settle
  await delay(250);
  const drawsAtRest = await evaluate(() => __kf006a.draws);
  await delay(800);
  const restCheck = await evaluate(() => ({ draws: __kf006a.draws, raf: __kf006a.raf.size }));
  check(
    'ui: zero continuous idle rendering after material updates settle',
    restCheck.draws === drawsAtRest && restCheck.raf === 0,
  );

  // Reset in Exploded live 3D -> restores canonical default Forest / Charcoal / Matched / L45 / ALU and Studio 3/4
  await evaluate(() => {
    [...document.querySelectorAll('#build-studio .kf-studio-actions button')]
      .find((b) => b.textContent.trim() === 'Reset')
      .click();
  });
  await delay(250);
  const afterLiveReset = await studioSummary();
  await captureStudio('14-reset-canonical-default.png');
  check(
    'ui: Reset in active 3D restores canonical default KF01-FOR-CHR-MTC-L45-ALU',
    afterLiveReset.code === 'KF01-FOR-CHR-MTC-L45-ALU' &&
      afterLiveReset.closingCode === 'KF01-FOR-CHR-MTC-L45-ALU',
  );

  // Set custom config, verify it survives Switch Lab handoff, Switch Lab explicit Apply boundary, and context loss!
  await clickStudioTab('Exterior');
  await clickRadio('Enclosure finish', 'Carbon');
  await clickStudioTab('Keycaps');
  await clickRadio('Keycap set (1.5 mm PBT)', 'Two-Tone Slate');
  await clickRadio('Escape key', 'Ivory Esc');

  // Switch Lab preview must NOT mutate Build Studio; Apply must update Build Studio switch
  await evaluate(() => {
    const tabs = [...document.querySelectorAll('#switch-lab .kf-switch-lab__tabs button')];
    tabs.find((b) => b.textContent.includes('Silent 50')).click();
  });
  await delay(80);
  const beforeApplyCode = (await studioSummary()).code;
  await evaluate(() => {
    document.querySelector('[data-kf-viewport="switch-lab"] .kf-viewport-host__action:last-child').click();
  });
  await until(
    () =>
      evaluate(
        () => document.querySelector('[data-kf-viewport="switch-lab"]')?.dataset.kfViewportMode === 'interactive-3d',
      ),
    'switch-lab handoff',
  );
  await evaluate(() => {
    const btns = [...document.querySelectorAll('#switch-lab .kf-switch-panel__footer button')];
    btns.find((b) => b.textContent.includes('Apply to Build Studio')).click();
  });
  await delay(80);
  const afterApplyCode = (await studioSummary()).code;
  check(
    'ui: Switch Lab preview keeps Build Studio isolated; explicit Apply updates switch and preserves build',
    beforeApplyCode === 'KF01-CRB-SLT-IVR-L45-ALU' && afterApplyCode === 'KF01-CRB-SLT-IVR-S50-ALU',
  );

  // Reactivate Build Studio after handoff -> configuration preserved!
  await toggleStudio();
  await waitStudioMode('interactive-3d');
  const afterHandoffCode = (await studioSummary()).code;

  // Synthetic WebGL context loss retains full configuration and restores photography cleanly
  await evaluate(() => {
    const gl = [...__kf006a.activeContexts][0];
    gl.getExtension('WEBGL_lose_context').loseContext();
  });
  await waitStudioMode('runtime-error');
  const afterContextLoss = await studioSummary();
  await toggleStudio();
  await waitStudioMode('interactive-3d');
  const afterRetry = await studioSummary();
  check(
    'ui: configuration survives viewport handoff, synthetic context loss, and 3D retry',
    afterHandoffCode === 'KF01-CRB-SLT-IVR-S50-ALU' &&
      afterContextLoss.code === 'KF01-CRB-SLT-IVR-S50-ALU' &&
      afterRetry.code === 'KF01-CRB-SLT-IVR-S50-ALU',
  );

  // Reset during viewport loading works cleanly
  await toggleStudio();
  await waitStudioMode('static-fallback');
  await evaluate(() => {
    __kf006a.holdAsset = 'legend-2048.json';
  });
  await toggleStudio();
  await until(async () => (await evaluate(() => __kf006a.heldCount)) >= 1, 'held during load');
  await evaluate(() => {
    [...document.querySelectorAll('#build-studio .kf-studio-actions button')]
      .find((b) => b.textContent.trim() === 'Reset')
      .click();
    __kf006a.holdAsset = '';
    __kf006a.resumeAsset?.();
  });
  await waitStudioMode('interactive-3d');
  const afterLoadReset = await studioSummary();
  check(
    'ui: Reset during viewport loading resolves to canonical default without error',
    afterLoadReset.code === 'KF01-FOR-CHR-MTC-L45-ALU',
  );

  // Zero audio requests across entire Build Studio session
  const anyAudioRequests = requests.some((u) => /\/audio\//.test(u));
  check('ui: zero audio requests triggered by Build Studio activation and configuration', !anyAudioRequests);

  // Mobile 390x844 Build Studio capture (static partial + live 3D 1024 tier)
  await toggleStudio();
  await waitStudioMode('static-fallback');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await clickStudioTab('Exterior');
  await clickRadio('Enclosure finish', 'Obsidian');
  await clickStudioTab('Keycaps');
  await clickRadio('Keycap set (1.5 mm PBT)', 'Two-Tone Slate');
  await clickRadio('Escape key', 'Brass Accent');
  await captureStudio('15-mobile-static-partial.png');

  requests.length = 0;
  await toggleStudio();
  await waitStudioMode('interactive-3d');
  const mobileUses1024 = requests.some((u) => /legend-1024\.json/.test(u));
  const mobileOverflow = await evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  await captureStudio('16-mobile-live-3d.png');
  check(
    'ui-mobile: 390px Build Studio configures cleanly with 1024 legend tier and 0 horizontal overflow',
    mobileUses1024 && mobileOverflow === 0 && (await studioSummary()).code === 'KF01-OBS-SLT-BRS-L45-ALU',
  );

  // Compose 4 grouped visual evidence contact sheets inside .tmp/kf006a-evidence/
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await composeContactSheet(
    'contact-sheet-enclosure-keycaps.png',
    'KF-006A — 1. Enclosure & Keycap Sets (Live Production 3D)',
    [
      { file: '01-default-forest-charcoal.png', label: '01 Default: Forest / Charcoal PBT / Matched' },
      { file: '02-forest-porcelain.png', label: '02 Porcelain PBT on Forest (dark legends)' },
      { file: '03-forest-twotone-slate.png', label: '03 Two-Tone Slate on Forest (mixed contrast)' },
      { file: '04-titanium-twotone-slate.png', label: '04 Titanium + Two-Tone Slate' },
      { file: '05-obsidian-porcelain.png', label: '05 Obsidian + Porcelain PBT' },
      { file: '14-reset-canonical-default.png', label: '06 Reset to Canonical Default (Forest/Charcoal)' },
    ],
    2,
  );
  await composeContactSheet(
    'contact-sheet-escape-accents.png',
    'KF-006A — 2. Escape Accent Precedence & Legend Contrast',
    [
      { file: '06-accent-matched.png', label: '01 Matched Escape (Charcoal PBT)' },
      { file: '07-accent-ivory.png', label: '02 Ivory Esc on Charcoal (dark Esc legend)' },
      { file: '08-accent-forest.png', label: '03 Forest Esc on Porcelain (light Esc legend)' },
      { file: '09-accent-brass.png', label: '04 Brass Accent on Charcoal (dark Esc legend)' },
    ],
    2,
  );
  await composeContactSheet(
    'contact-sheet-internals.png',
    'KF-006A — 3. Internal Installed Switch & Plate Materials (Exploded)',
    [
      { file: '11-internal-linear45-aluminium.png', label: '01 Linear 45 (Porcelain stem) + Brushed Aluminium' },
      { file: '12-internal-tactile58-fr4.png', label: '02 Tactile 58 (Signal stem) + Matte FR4' },
      { file: '13-internal-silent50-polycarbonate.png', label: '03 Silent 50 (Forest stem) + Frosted Polycarbonate' },
      { file: '10-internal-tactile58-brass.png', label: '04 Tactile 58 (Signal stem) + Sandblasted Brass' },
    ],
    2,
  );
  await composeContactSheet(
    'contact-sheet-mobile.png',
    'KF-006A — 4. Mobile 390px Build Studio (Static Partial & Live 3D 1024-tier)',
    [
      { file: '15-mobile-static-partial.png', label: '01 Mobile 390px Static Partial Disclosure' },
      { file: '16-mobile-live-3d.png', label: '02 Mobile 390px Live 3D (Obsidian / Slate / Brass)' },
    ],
    2,
  );

  check('ui: zero console or runtime errors across entire KF-006A suite', errors.length === 0);

  const failed = Object.keys(checks).filter((k) => !checks[k]);
  await writeFile(
    new URL('kf006a-checks.json', output),
    JSON.stringify({ renderer: probeInit.renderer, runtimeDetails, checks, failed, errors }, null, 2) + '\n',
  );
  console.log(`${Object.keys(checks).length - failed.length}/${Object.keys(checks).length} KF-006A assertions passed`);
  console.log('Renderer:', probeInit.renderer);
  if (errors.length > 0) console.error('Errors:', errors);
  assert.deepEqual(failed, []);
  assert.deepEqual(errors, []);
} finally {
  browser.close();
}
