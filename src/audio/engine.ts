/**
 * KEYFORM — Shared Recorded-Sample Mechanical Audio Engine (migrated from Audio V2).
 *
 * Framework-independent and Three.js-independent so Switch Lab (KF-005) and
 * Build Studio typing (KF-006) share one bounded Web Audio engine.
 *
 * Contract:
 *  - Construction is inert (zero AudioContext, zero network requests).
 *  - Explicit user gesture calls `enable()` then `loadSamples()`.
 *  - Recorded CC0 WAVs only; zero procedural DSP fallback.
 *  - Bounded 16-voice pool with oldest-voice stealing and releasing node cap.
 */
import { RecordedSampleProvider } from './sampleProvider';
import type {
  AudioEngineStats,
  KeyAcousticClass,
  SampleLoadState,
  SampleStatus,
  Stroke,
  SwitchProfileId,
} from './types';

export interface MechanicalAudioEngineOptions {
  contextFactory?: () => AudioContext;
  maxVoices?: number;
  initialVolume?: number;
  initialProfile?: SwitchProfileId;
  sampleBaseUrl?: string;
}

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  keyId: string;
  startedAt: number;
}

const VALID_PROFILES: ReadonlySet<SwitchProfileId> = new Set([
  'linear-45',
  'tactile-58',
  'silent-50',
]);

const DEFAULT_MAX_VOICES = 16;
const DEFAULT_VOLUME = 0.6;
const RECORDED_GAIN = 0.6;
const SOFT_CLIP_DRIVE = 1.15;

export function resolveDefaultAudioBaseUrl(): string {
  const base = new URL(import.meta.env.BASE_URL, document.baseURI);
  return new URL('audio/kf01-v2/', base).href;
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, value));
}

export class MechanicalAudioEngine {
  private readonly contextFactory: () => AudioContext;
  private readonly maxVoices: number;
  private readonly sampleBaseUrl: string;
  private readonly samples = new RecordedSampleProvider();

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private shaper: WaveShaperNode | null = null;

  private volume = DEFAULT_VOLUME;
  private profile: SwitchProfileId = 'linear-45';
  private enabled = false;
  private muted = false;
  private disposed = false;
  private lifecycleGen = 0;
  private loadAbort: AbortController | null = null;

  private readonly active: Voice[] = [];
  private readonly releasing: Voice[] = [];
  private startedVoices = 0;
  private endedVoices = 0;
  private stolenVoices = 0;

  constructor(options: MechanicalAudioEngineOptions = {}) {
    this.contextFactory =
      options.contextFactory ?? (() => new AudioContext({ latencyHint: 'interactive' }));
    this.maxVoices = Math.min(
      32,
      Math.max(1, Math.round(options.maxVoices ?? DEFAULT_MAX_VOICES)),
    );
    this.volume = clampVolume(options.initialVolume ?? DEFAULT_VOLUME);
    this.profile = options.initialProfile ?? 'linear-45';
    this.sampleBaseUrl = options.sampleBaseUrl ?? resolveDefaultAudioBaseUrl();
  }

  async enable(): Promise<void> {
    this.assertNotDisposed();
    const gen = ++this.lifecycleGen;
    if (!this.ctx) this.createGraph();
    const ctx = this.ctx;
    if (!ctx) throw new Error('Audio context unavailable.');
    if (ctx.state !== 'running') {
      await ctx.resume();
    }
    if (this.disposed || gen !== this.lifecycleGen) {
      throw new DOMException('Audio enable superseded.', 'AbortError');
    }
    this.enabled = true;
  }

  async loadSamples(signal?: AbortSignal): Promise<void> {
    this.assertNotDisposed();
    if (!this.enabled) throw new DOMException('Audio disabled before sample load.', 'AbortError');
    if (this.samples.getState() === 'ready') return;
    if (!this.ctx) throw new Error('Enable audio before loading samples.');

    const gen = this.lifecycleGen;
    this.loadAbort?.abort();
    const localAbort = new AbortController();
    this.loadAbort = localAbort;
    const onExternalAbort = () => localAbort.abort(signal?.reason);
    signal?.addEventListener('abort', onExternalAbort, { once: true });
    try {
      if (signal?.aborted) localAbort.abort(signal.reason);
      await this.samples.load(this.ctx, this.sampleBaseUrl, localAbort.signal);
      if (this.disposed || !this.enabled || gen !== this.lifecycleGen) {
        throw new DOMException('Audio sample load superseded.', 'AbortError');
      }
    } finally {
      signal?.removeEventListener('abort', onExternalAbort);
      if (this.loadAbort === localAbort) this.loadAbort = null;
    }
  }

  disable(): void {
    this.lifecycleGen += 1;
    this.loadAbort?.abort();
    this.loadAbort = null;
    this.enabled = false;
    if (!this.ctx) return;
    this.stopAllVoices(0.008);
    void this.ctx.suspend().catch(() => undefined);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.lifecycleGen += 1;
    this.loadAbort?.abort();
    this.loadAbort = null;
    this.enabled = false;
    this.stopAllVoices(0.004);
    this.releasing.length = 0;
    this.samples.clear();

    const ctx = this.ctx;
    const master = this.masterGain;
    const shaper = this.shaper;
    this.ctx = null;
    this.masterGain = null;
    this.shaper = null;

    try {
      master?.disconnect();
      shaper?.disconnect();
    } catch {
      /* already disconnected */
    }
    if (ctx && ctx.state !== 'closed') {
      try {
        await ctx.close();
      } catch {
        /* already closing */
      }
    }
  }

  setProfile(profile: SwitchProfileId): void {
    this.assertNotDisposed();
    if (!VALID_PROFILES.has(profile)) {
      throw new Error(`Unknown switch profile "${profile}".`);
    }
    this.profile = profile;
  }

  getProfile(): SwitchProfileId {
    return this.profile;
  }

  setVolume(volume: number): void {
    this.assertNotDisposed();
    this.volume = clampVolume(volume);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  setMuted(muted: boolean): void {
    this.assertNotDisposed();
    this.muted = muted;
    if (muted) this.stopAllVoices(0.01);
  }

  isMuted(): boolean {
    return this.muted;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getSampleState(): SampleLoadState {
    return this.samples.getState();
  }

  getSampleStatus(): SampleStatus {
    return this.samples.getStatus();
  }

  keyDown(keyId: string, acousticClass: KeyAcousticClass = 'standard'): void {
    this.play(keyId, acousticClass, 'down');
  }

  keyUp(keyId: string, acousticClass: KeyAcousticClass = 'standard'): void {
    this.play(keyId, acousticClass, 'up');
  }

  releaseAll(): void {
    this.stopAllVoices(0.01);
  }

  getStats(): AudioEngineStats {
    return {
      activeVoices: this.active.length,
      releasingVoices: this.releasing.length,
      maxVoices: this.maxVoices,
      startedVoices: this.startedVoices,
      endedVoices: this.endedVoices,
      stolenVoices: this.stolenVoices,
      cachedBuffers: this.samples.getBufferedFiles(),
      contextState: this.ctx ? this.ctx.state : 'none',
      sampleState: this.samples.getState(),
    };
  }

  private assertNotDisposed(): void {
    if (this.disposed) throw new Error('Audio engine has been disposed.');
  }

  private createGraph(): void {
    const ctx = this.contextFactory();
    const master = ctx.createGain();
    master.gain.value = this.volume;

    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < curve.length; i += 1) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * SOFT_CLIP_DRIVE);
    }
    shaper.curve = curve;
    shaper.oversample = 'none';

    master.connect(shaper);
    shaper.connect(ctx.destination);

    this.ctx = ctx;
    this.masterGain = master;
    this.shaper = shaper;
  }

  private play(keyId: string, acousticClass: KeyAcousticClass, stroke: Stroke): void {
    if (this.disposed || !this.enabled || this.muted) return;
    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master || ctx.state !== 'running') return;

    const buffer = this.samples.bufferFor(this.profile, acousticClass, stroke);
    if (!buffer) return;

    if (this.active.length >= this.maxVoices) this.stealOldest();

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = RECORDED_GAIN;
    source.connect(gain);
    gain.connect(master);

    const voice: Voice = {
      source,
      gain,
      keyId,
      startedAt: ctx.currentTime,
    };
    source.onended = () => this.endVoice(voice);

    try {
      source.start(ctx.currentTime + 0.003);
    } catch {
      return;
    }
    this.active.push(voice);
    this.startedVoices += 1;
  }

  private stealOldest(): void {
    const voice = this.active.shift();
    if (!voice) return;
    this.stolenVoices += 1;
    this.fadeAndStop(voice, 0.012);
  }

  private stopAllVoices(fadeSeconds: number): void {
    const voices = this.active.splice(0, this.active.length);
    for (const voice of voices) this.fadeAndStop(voice, fadeSeconds);
  }

  private fadeAndStop(voice: Voice, fadeSeconds: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    this.releasing.push(voice);
    while (this.releasing.length > this.maxVoices) {
      const excess = this.releasing.shift();
      if (!excess) break;
      try {
        excess.source.stop(now);
      } catch {
        /* already stopped */
      }
    }
    const gainParam = voice.gain.gain;
    try {
      gainParam.cancelScheduledValues(now);
      gainParam.setValueAtTime(gainParam.value, now);
      gainParam.linearRampToValueAtTime(0.0001, now + fadeSeconds);
    } catch {
      /* disconnected */
    }
    try {
      voice.source.stop(now + fadeSeconds + 0.002);
    } catch {
      /* already stopped */
    }
  }

  private endVoice(voice: Voice): void {
    const idx = this.active.indexOf(voice);
    if (idx >= 0) this.active.splice(idx, 1);
    const relIdx = this.releasing.indexOf(voice);
    if (relIdx >= 0) this.releasing.splice(relIdx, 1);
    try {
      voice.source.disconnect();
      voice.gain.disconnect();
    } catch {
      /* already disconnected */
    }
    this.endedVoices += 1;
  }
}
