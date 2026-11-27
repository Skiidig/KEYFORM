import { KF01_ASSEMBLY_GROUPS } from '../types';
import { sha256Hex } from '../lib/digest';
import type { AssetManifest, AssetVariantPartitionKey } from '../types/manifest';

const version = 'kf01-kf004b-b3.1';
const meshopt = 'EXT_meshopt_compression';
const parts = ['exterior', 'internal', 'hero_switch'] as const;
const partitions: AssetVariantPartitionKey[] = [...parts, 'encoder_macro'];

export interface AssetPackage {
  manifest: AssetManifest;
  signal: AbortSignal;
  resolve(path: string): URL;
  bytes(path: string, size: number, sha256: string): Promise<ArrayBuffer>;
}

export async function loadAssetPackage(signal: AbortSignal): Promise<AssetPackage> {
  const base = new URL(import.meta.env.BASE_URL, document.baseURI);
  const url = new URL('assets/kf01/' + version + '/manifest.json', base);
  const directory = new URL('./', url);
  const resolve = (path: string) => {
    if (!/^(models|textures)\/[a-z0-9][a-z0-9_.-]*$/.test(path)) {
      throw new Error('Invalid runtime asset path');
    }
    return new URL(path, directory);
  };
  const response = await fetch(url, { signal, redirect: 'error' });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('3D manifest unavailable');
  }
  const manifest = await response.json() as AssetManifest;
  if (manifest?.asset_version !== version || manifest.schema_version !== '1.2.0'
      || manifest.runtime_integration?.decoder?.required !== meshopt) {
    throw new Error('Unsupported 3D asset package');
  }
  const check = (path: string, size: number, sha: string) => {
    resolve(path);
    if (!Number.isSafeInteger(size) || size < 1 || !/^[a-f0-9]{64}$/.test(sha)) {
      throw new Error('Invalid 3D integrity metadata');
    }
  };
  for (const part of partitions) {
    const variants = manifest.asset_variants?.[part];
    if (part === 'encoder_macro' && !variants) continue;
    const model = part === 'hero_switch' ? variants?.uncompressed : variants?.meshopt;
    if (!model || model.requires !== (part === 'hero_switch' ? undefined : meshopt)) {
      throw new Error('Invalid 3D model variant');
    }
    check(model.relative_path, model.bytes, model.sha256);
    if (part !== 'encoder_macro' && manifest.assets?.[part]?.relative_path !== model.relative_path) {
      throw new Error('3D partition metadata disagrees');
    }
  }
  if (manifest.assembly_groups?.length !== KF01_ASSEMBLY_GROUPS.length
      || !KF01_ASSEMBLY_GROUPS.every((id) => manifest.assembly_groups.some((group) => group.id === id))
      || manifest.keys?.length !== 81 || new Set(manifest.keys.map((key) => key.id)).size !== 81
      || !manifest.keys.some((key) => key.id === 'Space')) {
    throw new Error('Invalid 3D product semantics');
  }
  for (const tier of ['mobile', 'desktop'] as const) {
    const spec = manifest.legend_atlas?.tiers.find((entry) => entry.tier === tier);
    if (!spec || spec.resolution !== (tier === 'mobile' ? 1024 : 2048)) {
      throw new Error('Missing 3D legend tier');
    }
    check(spec.file, spec.bytes, spec.sha256);
    check(spec.mapping, spec.mapping_bytes, spec.mapping_sha256);
  }
  signal.throwIfAborted();
  const pending = new Map<string, Promise<ArrayBuffer>>();
  return {
    manifest, signal, resolve,
    bytes(path, size, sha) {
      signal.throwIfAborted();
      const key = path + ':' + size + ':' + sha;
      const previous = pending.get(key);
      if (previous) return previous;
      const operation = (async () => {
        const res = await fetch(resolve(path), { signal, redirect: 'error' });
        if (!res.ok || res.headers.get('content-type')?.includes('text/html')) {
          throw new Error('3D resource unavailable (HTTP ' + res.status + ')');
        }
        const bytes = await res.arrayBuffer();
        if (size !== bytes.byteLength || await sha256Hex(bytes) !== sha) {
          throw new Error('3D resource failed its integrity check');
        }
        signal.throwIfAborted();
        return bytes;
      })().finally(() => pending.delete(key));
      pending.set(key, operation);
      return operation;
    },
  };
}
