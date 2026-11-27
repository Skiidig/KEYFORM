import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { openRuntimeBrowser, until } from './runtime-browser.mjs';

const output = new URL('../../.tmp/p1-evidence/', import.meta.url);
await mkdir(output, {recursive:true});
const result = await build({
  configFile: false,
  publicDir: false,
  logLevel: 'error',
  build: {
    minify: true,
    write: false,
    lib: {
      entry: fileURLToPath(new URL('../runtime-fixture.ts', import.meta.url)),
      name: 'KeyformRegression',
      formats: ['iife'],
    },
  },
});
const fixture = (Array.isArray(result) ? result[0] : result).output.find(({type}) => type === 'chunk').code;
const browser = await openRuntimeBrowser();
const {send, evaluate, on} = browser;
try {
  await send('Page.enable');
  await send('Runtime.enable');
  const errors = [];
  on('Runtime.exceptionThrown', ({exceptionDetails}) => errors.push(exceptionDetails.exception?.description ?? exceptionDetails.text));
  on('Runtime.consoleAPICalled', ({type,args}) => {
    if (type === 'error') errors.push(args.map(({value,description}) => value ?? description).join(' '));
  });
  await send('Emulation.setDeviceMetricsOverride', {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate', {url:process.env.BASE_URL ?? 'http://127.0.0.1:4185/'});
  await until(() => evaluate(() => !!document.querySelector('[data-kf-viewport]')), 'visitor entry');
  assert.equal(await evaluate(() => typeof globalThis.keyformFixture), 'undefined');
  const setup = await send('Runtime.evaluate', {expression:fixture});
  assert.equal(setup.exceptionDetails, undefined, JSON.stringify(setup.exceptionDetails));
  const metrics = await evaluate(() => keyformFixture.core());
  let actual = 0;
  for (const id of ['Esc','F5','A','Space','Enter','Delete','Up','Right']) {
    const {x,y} = await evaluate((id) => keyformFixture.project(id), id);
    await send('Input.dispatchMouseEvent', {type:'mousePressed', button:'left', x, y, clickCount:1});
    await send('Input.dispatchMouseEvent', {type:'mouseReleased', button:'left', x, y, clickCount:1});
    if (await evaluate(() => keyformFixture.picked()) === id) actual++;
  }
  const cycles = await evaluate(() => keyformFixture.remounts());
  const checks = await evaluate(() => keyformFixture.checks);
  checks['8 projected real pointer events'] = actual === 8;
  checks['no unexpected runtime JS errors'] = errors.length === 0;
  const evidence = { checks, metrics, remountResources:cycles, errors };
  await writeFile(new URL('mechanical.json', output), JSON.stringify(evidence, null, 2) + '\n');
  const failed = Object.keys(checks).filter((name) => !checks[name]);
  console.log((Object.keys(checks).length - failed.length) + '/' + Object.keys(checks).length + ' production fixture assertions');
  console.log(JSON.stringify({ renderer:metrics.renderer, exterior:metrics.exterior, exploded:metrics.exploded, cycles, failed }, null, 2));
  assert.deepEqual(failed, []);
} finally {
  browser.close();
}
