import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

export async function until(read, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  do {
    const value = await read();
    if (value) return value;
    await delay(50);
  } while (Date.now() < deadline);
  throw new Error('Timed out waiting for ' + label);
}

export async function openRuntimeBrowser() {
  const scratch = fileURLToPath(new URL('../../.tmp/', import.meta.url));
  await mkdir(scratch, { recursive: true });
  const profile = await mkdtemp(join(scratch, 'edge-p1-'));
  const exe = process.env.EDGE_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const browser = spawn(exe, [
    '--headless=new', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11',
    '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  let launchError;
  let ws;
  browser.on('error', (error) => { launchError = error; });
  try {
    const port = await until(async () => {
      if (launchError) throw launchError;
      if (browser.exitCode !== null) throw new Error('Edge exited with code ' + browser.exitCode);
      try {
        return (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0].trim();
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }, 'Edge debugger');
    const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    ws = new WebSocket(targets.find(({type}) => type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
  } catch (error) {
    browser.kill();
    throw error;
  }
  const commands = new Map();
  const events = new Map();
  let id = 0;
  ws.addEventListener('message', ({data}) => {
    const reply = JSON.parse(String(data));
    const command = commands.get(reply.id);
    if (command) {
      commands.delete(reply.id);
      if (reply.error) command.reject(new Error(JSON.stringify(reply.error)));
      else command.resolve(reply.result);
    }
    for (const cb of events.get(reply.method) ?? []) cb(reply.params);
  });
  ws.addEventListener('close', () => {
    for (const {reject} of commands.values()) reject(new Error('Edge debugger closed'));
    commands.clear();
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    commands.set(++id, { resolve, reject });
    ws.send(JSON.stringify({id, method, params}));
  });
  return {
    send,
    on(method, cb) { events.set(method, [...(events.get(method) ?? []), cb]); },
    async evaluate(fn, ...args) {
      const result = await send('Runtime.evaluate', {
        expression: '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')',
        returnByValue: true, awaitPromise: true,
      });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result?.value;
    },
    async screenshot() {
      const {data} = await send('Page.captureScreenshot', {format: 'png'});
      return Buffer.from(data, 'base64');
    },
    close() {
      ws.close();
      browser.kill();
    },
  };
}
