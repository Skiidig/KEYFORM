/**
 * KEYFORM — Recorded CC0 Sample Provider (migrated from Audio V2).
 *
 * Fetches and decodes the verified 18-file CC0 sample bank once per AudioContext
 * lifecycle, validating byte length and SHA-256 against the manifest before decode.
 * Playback lookups (`bufferFor`) are strictly synchronous with zero network or
 * decode work and zero procedural fallback.
 */
import { sha256Hex } from '../runtime/lib/digest';
import type {
  KeyAcousticClass,
  SampleBankManifest,
  SampleLoadState,
  SampleStatus,
  Stroke,
  SwitchProfileId,
} from './types';

export class RecordedSampleProvider {
  private manifest: SampleBankManifest | null = null;
  private readonly files = new Map<string, AudioBuffer>();
  private readonly banks = new Map<string, AudioBuffer[]>();
  private readonly cursor = new Map<string, number>();
  private state: SampleLoadState = 'idle';
  private error: string | null = null;
  private pending: Promise<void> | null = null;
  private generation = 0;

  getState(): SampleLoadState {
    return this.state;
  }

  getStatus(): SampleStatus {
    return {
      state: this.state,
      error: this.error,
      files: this.files.size,
      bytes: this.manifest?.payloadBytes ?? 0,
      sources: this.manifest?.sources ?? [],
      generatedAt: this.manifest?.generatedAt ?? null,
    };
  }

  getManifest(): SampleBankManifest | null {
    return this.manifest;
  }

  getBufferedFiles(): number {
    return this.files.size;
  }

  async load(ctx: BaseAudioContext, baseUrl: string, signal?: AbortSignal): Promise<void> {
    if (this.state === 'ready') return;
    if (this.pending) return this.pending;
    signal?.throwIfAborted();

    const gen = ++this.generation;
    this.state = 'loading';
    this.error = null;
    const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const run = this.loadInternal(ctx, normalized, gen, signal);
    this.pending = run;
    try {
      await run;
    } finally {
      if (this.pending === run) this.pending = null;
    }
  }

  /** Synchronous round-robin buffer lookup. Never fetches or decodes. */
  bufferFor(
    profile: SwitchProfileId,
    acousticClass: KeyAcousticClass,
    stroke: Stroke,
  ): AudioBuffer | null {
    if (this.state !== 'ready') return null;
    const bank = this.bankFor(profile, acousticClass, stroke);
    if (!bank || bank.length === 0) return null;
    const key = `${profile}|${acousticClass}|${stroke}`;
    const index = (this.cursor.get(key) ?? 0) % bank.length;
    this.cursor.set(key, index + 1);
    return bank[index] ?? null;
  }

  clear(): void {
    this.generation += 1;
    this.files.clear();
    this.banks.clear();
    this.cursor.clear();
    this.manifest = null;
    this.state = 'idle';
    this.error = null;
  }

  private bankFor(
    profile: SwitchProfileId,
    acousticClass: KeyAcousticClass,
    stroke: Stroke,
  ): AudioBuffer[] | null {
    const exact = this.banks.get(`${profile}|${acousticClass}|${stroke}`);
    if (exact) return exact;
    if (acousticClass === 'stabilized') {
      return this.banks.get(`${profile}|standard|${stroke}`) ?? null;
    }
    return null;
  }

  private async loadInternal(
    ctx: BaseAudioContext,
    baseUrl: string,
    gen: number,
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      const response = await fetch(`${baseUrl}manifest.json`, {
        signal,
        redirect: 'error',
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        throw new Error(`manifest HTTP ${response.status}`);
      }
      const manifest = (await response.json()) as SampleBankManifest;
      if (!manifest || manifest.version !== 1 || !manifest.banks || !manifest.files) {
        throw new Error('unrecognised sample manifest');
      }

      const paths = [...new Set(Object.values(manifest.banks).flat())];
      const decoded = await Promise.all(
        paths.map(async (relPath) => {
          if (!/^[a-z0-9-]+\/[a-z0-9-]+\.wav$/.test(relPath)) {
            throw new Error(`invalid sample path ${relPath}`);
          }
          const meta = manifest.files[relPath];
          if (!meta) throw new Error(`missing metadata for ${relPath}`);
          const file = await fetch(`${baseUrl}${relPath}`, {
            signal,
            redirect: 'error',
          });
          if (!file.ok) throw new Error(`${relPath} HTTP ${file.status}`);
          const bytes = await file.arrayBuffer();
          if (bytes.byteLength !== meta.bytes || (await sha256Hex(bytes)) !== meta.sha256) {
            throw new Error(`${relPath} failed integrity check`);
          }
          signal?.throwIfAborted();
          if (gen !== this.generation) {
            throw new DOMException('Audio load superseded', 'AbortError');
          }
          const buffer = await ctx.decodeAudioData(bytes.slice(0));
          if (buffer.length === 0 || buffer.numberOfChannels === 0) {
            throw new Error(`${relPath} decoded to an empty buffer`);
          }
          return [relPath, buffer] as const;
        }),
      );

      signal?.throwIfAborted();
      if (gen !== this.generation) {
        throw new DOMException('Audio load superseded', 'AbortError');
      }

      this.files.clear();
      this.banks.clear();
      this.cursor.clear();
      for (const [path, buffer] of decoded) this.files.set(path, buffer);

      for (const [key, pathsInBank] of Object.entries(manifest.banks)) {
        const list = pathsInBank
          .map((path) => this.files.get(path))
          .filter((buffer): buffer is AudioBuffer => Boolean(buffer));
        if (list.length !== pathsInBank.length || list.length === 0) {
          throw new Error(`bank ${key} references a missing decoded file`);
        }
        this.banks.set(key, list);
      }

      this.manifest = manifest;
      this.state = 'ready';
      this.error = null;
    } catch (error) {
      if (gen !== this.generation || signal?.aborted) {
        throw error;
      }
      this.files.clear();
      this.banks.clear();
      this.manifest = null;
      this.state = 'error';
      this.error = `Sound preview unavailable: ${
        error instanceof Error ? error.message : String(error)
      }`;
      throw new Error(this.error);
    }
  }
}
