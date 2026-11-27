export const initialProbe = (manualOnly = false) => {
  // Exercise the explicit lifecycle even when individual tests enable animation.
  if (manualOnly) Object.defineProperty(navigator, 'hardwareConcurrency', { value: 2 });
  const probe = globalThis.runtimeProbe = {
    active: new Set(), max: 0, draws: 0, raf: new Set(), firstDraw: {},
    fault: '', hold: '', held: 0, aborted: 0, readyWhileDetached: 0, renderer: '',
    mediaListeners: new Set(), stageObservers: new Set(), holdDecode: false, decoding: false, decodedClosed: 0,
    views: new WeakMap(), contextDraws: new WeakMap(), internalFailures: 0,
    created: 0, automaticContexts: 0, eligibilityListeners: new Set(),
  };
  const NativeResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class extends NativeResizeObserver {
    observe(element, options) {
      super.observe(element, options);
      if (!element.matches('.kf-viewport-host__canvas-slot')) return;
      probe.stageObservers.add(this);
      if (probe.fault === 'stage-observe') throw new Error('Injected failure after stage observation');
    }
    disconnect() {
      probe.stageObservers.delete(this);
      super.disconnect();
    }
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
      const listeners = query.includes('no-preference') ? probe.eligibilityListeners : probe.mediaListeners;
      media.addEventListener = (name, handler, options) => {
        listeners.add(handler);
        options?.signal?.addEventListener('abort', () => listeners.delete(handler), { once: true });
        add(name, handler, options);
      };
      media.removeEventListener = (name, handler) => { listeners.delete(handler); remove(name, handler); };
    }
    return media;
  };
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, options) {
    if (type === 'webgl2' && probe.fault === 'renderer') return null;
    const gl = original.call(this, type, options);
    if (type !== 'webgl2' || !gl || probe.active.has(gl)) return gl;
    probe.created++;
    if (options?.failIfMajorPerformanceCaveat) probe.automaticContexts++;
    probe.active.add(gl);
    probe.contextDraws.set(gl, 0);
    probe.max = Math.max(probe.max, probe.active.size);
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    probe.renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const loss = gl.getExtension('WEBGL_lose_context');
    if (loss) {
      const lose = loss.loseContext.bind(loss);
      loss.loseContext = () => { probe.active.delete(gl); lose(); };
    }
    const viewLocations = new WeakSet();
    const getUniformLocation = gl.getUniformLocation.bind(gl);
    gl.getUniformLocation = (program, name) => {
      const location = getUniformLocation(program, name);
      if (location && name === 'viewMatrix') viewLocations.add(location);
      return location;
    };
    const uniformMatrix4fv = gl.uniformMatrix4fv.bind(gl);
    gl.uniformMatrix4fv = (location, transpose, values, ...rest) => {
      if (viewLocations.has(location) && gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) === null) {
        probe.views.set(gl, Array.from(values));
      }
      uniformMatrix4fv(location, transpose, values, ...rest);
    };
    let first = true;
    for (const method of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const native = gl[method].bind(gl);
      gl[method] = (...args) => {
        if (gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) === null) {
          probe.draws++;
          probe.contextDraws.set(gl, probe.contextDraws.get(gl) + 1);
          if (first) {
            first = false;
            const host = this.closest('[data-kf-viewport]');
            if (!host) probe.readyWhileDetached++;
            else probe.firstDraw[host.dataset.kfViewport] = {
              staticVisible: host.querySelector('picture img')?.checkVisibility({opacityProperty: true, visibilityProperty: true}) === true,
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
    if (probe.fault === 'internal' && href.includes('internal_b21')) {
      probe.internalFailures++;
      return new Response('', {status: 404});
    }
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
