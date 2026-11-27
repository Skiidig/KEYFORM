import type { SwitchProfileId } from '../runtime/types';

export type { SwitchProfileId };
export type KeyAcousticClass = 'standard' | 'stabilized' | 'spacebar';
export type Stroke = 'down' | 'up';
export type SampleLoadState = 'idle' | 'loading' | 'ready' | 'error';

export interface SampleFileMeta {
  bytes: number;
  sha256: string;
  durationSec: number;
  sampleRate: number;
  channels: number;
  sourceId: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl: string;
  original: string;
  recording: string;
  sourceSha256: string;
  modifications: string;
}

export interface SampleSourceInfo {
  id: string;
  url: string;
  author: string;
  license: string;
  licenseUrl: string;
  original: string;
  recording: string;
}

export interface SampleBankManifest {
  version: number;
  generatedAt: string;
  sampleRate: number;
  profileNotes: Record<SwitchProfileId, string>;
  banks: Record<string, string[]>;
  files: Record<string, SampleFileMeta>;
  sources: SampleSourceInfo[];
  payloadBytes: number;
  payloadFiles: number;
}

export interface SampleStatus {
  state: SampleLoadState;
  error: string | null;
  files: number;
  bytes: number;
  sources: SampleSourceInfo[];
  generatedAt: string | null;
}

export interface AudioEngineStats {
  activeVoices: number;
  releasingVoices: number;
  maxVoices: number;
  startedVoices: number;
  endedVoices: number;
  stolenVoices: number;
  cachedBuffers: number;
  contextState: AudioContextState | 'none';
  sampleState: SampleLoadState;
}
