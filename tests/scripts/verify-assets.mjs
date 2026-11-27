import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = new URL('../../', import.meta.url);
const dist = new URL('dist/', root);
const output = new URL('.tmp/p0-evidence/', root);
const base = new URL(process.env.BASE_URL ?? 'http://127.0.0.1:4185/');
const readJson = async (file) => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const inventory = await readJson('tests/production-asset-inventory.json');
const schema = await readJson('tests/kf01-production-manifest.schema.json');
const manifestURL = new URL(inventory.manifest, base);
const packageURL = new URL('./', manifestURL);
const packagePath = new URL(inventory.manifest, dist).pathname.replace(/manifest\.json$/, '');
const files = new Map();
const mime = {
  '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png',
  '.glb': 'model/gltf-binary', '.json': 'application/json', '.wav': 'audio/wav',
};

for (const [path, expected] of Object.entries(inventory.files)) {
  const url = new URL(path, base);
  const res = await fetch(url, { redirect: 'error' });
  assert.equal(res.status, 200, path);
  assert.equal(res.headers.get('content-type')?.split(';')[0], mime[extname(path)], path);
  const bytes = Buffer.from(await res.arrayBuffer());
  assert.equal(bytes.length, expected.bytes, path);
  assert.equal(sha256(bytes), expected.sha256, path);
  files.set(url.href, bytes);
}

const manifestBytes = files.get(manifestURL.href);
const manifest = JSON.parse(manifestBytes);
const ajv = addFormats(new Ajv2020({ allErrors: true, strict: false }));
const validate = ajv.compile(schema);
assert.ok(validate(manifest), ajv.errorsText(validate.errors));
assert.equal(manifest.asset_version, packageURL.pathname.split('/').at(-2));
assert.doesNotMatch(String(manifestBytes), /[a-z]:\\\\|"(?:https?:\/\/|\/(?:glb|tex|manifest)\/)/i);
assert.equal(manifest.keys.length, 81);
assert.equal(new Set(manifest.keys.map(({id}) => id)).size, 81);
assert.equal(manifest.assembly_groups.length, 9);

const used = new Set([manifestURL.href]);
function declaredBytes(relative, expected) {
  const url = new URL(relative, manifestURL);
  assert.ok(url.href.startsWith(packageURL.href), relative);
  const bytes = files.get(url.href);
  assert.ok(bytes, relative);
  assert.equal(bytes.length, expected.bytes, relative);
  assert.equal(sha256(bytes), expected.sha256, relative);
  used.add(url.href);
  return bytes;
}
const gltfs = {};
const requiredDecoder = manifest.runtime_integration.decoder.required;
for (const [key, variants] of Object.entries(manifest.asset_variants)) {
  const model = variants.meshopt ?? variants.uncompressed;
  if (manifest.assets[key]) {
    for (const name of ['relative_path', 'bytes', 'sha256', 'requires']) {
      assert.equal(manifest.assets[key][name], model[name], key);
    }
  }
  const bytes = declaredBytes(model.relative_path, model);
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(bytes.toString('ascii', 16, 20), 'JSON');
  const jsonEnd = 20 + bytes.readUInt32LE(12);
  assert.ok(jsonEnd < bytes.length, key);
  const gltf = JSON.parse(bytes.toString('utf8', 20, jsonEnd));
  assert.equal(gltf.extensionsRequired?.includes(requiredDecoder) ?? false, Boolean(variants.meshopt), key);
  assert.ok(gltf.buffers.every(({uri}) => !uri));
  assert.ok((gltf.images ?? []).every(({uri}) => !uri));
  gltfs[key] = gltf;
  if (key === 'exterior') {
    const normal = manifest.production_candidates.encoder.embedded_normal_map;
    assert.equal(normal.storage, 'embedded');
    const image = gltf.images.find(({name}) => name === normal.image);
    assert.ok(image && image.mimeType === 'image/png');
    const view = gltf.bufferViews[image.bufferView];
    assert.equal(bytes.toString('ascii', jsonEnd + 4, jsonEnd + 7), 'BIN');
    const start = jsonEnd + 8 + (view.byteOffset ?? 0);
    assert.equal(view.byteLength, normal.bytes);
    assert.equal(sha256(bytes.subarray(start, start + view.byteLength)), normal.sha256);
  }
}
assert.ok(gltfs.exterior && gltfs.internal && gltfs.hero_switch);
assert.equal(Boolean(gltfs.encoder_macro), manifest.runtime_integration.optional_asset_keys.includes('encoder_macro'));
for (const asset of Object.values(manifest.assets)) {
  for (const reference of asset.dependencies) assert.ok(used.has(new URL(reference, manifestURL).href));
}

for (const tier of manifest.legend_atlas.tiers) {
  const png = declaredBytes(tier.file, tier);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), tier.resolution);
  assert.equal(png.readUInt32BE(20), tier.resolution);
  const mapping = JSON.parse(declaredBytes(tier.mapping, {bytes: tier.mapping_bytes, sha256: tier.mapping_sha256}));
  assert.equal(mapping.assetVersion, manifest.asset_version);
  assert.equal(mapping.file, tier.file);
  assert.equal(mapping.textureSha256, tier.sha256);
  assert.equal(mapping.resolution, tier.resolution);
  assert.deepEqual(new Set(Object.keys(mapping.keys)), new Set(manifest.keys.map(({id}) => id)));
  assert.deepEqual(Object.keys(mapping.keys).filter((key) => mapping.keys[key].blank), ['Space']);
}
assert.deepEqual(new Set(manifest.legend_atlas.tiers.map(({resolution}) => resolution)), new Set([1024, 2048]));
const runtimeFiles = [...files.keys()].filter((url) => url.startsWith(packageURL.href));
assert.deepEqual(new Set(runtimeFiles), used, 'All public runtime files must be declared');
const entries = await readdir(new URL('./', new URL(inventory.manifest, dist)), { recursive: true, withFileTypes: true });
assert.equal(entries.filter((entry) => entry.isFile()).length, used.size, packagePath);
const kf003bAvif = [...files.keys()].filter((url) => url.includes('/media/kf003b/') && url.endsWith('.avif')).length;
const kf003bWebp = [...files.keys()].filter((url) => url.includes('/media/kf003b/') && url.endsWith('.webp')).length;
const art002aAvif = [...files.keys()].filter((url) => url.includes('/media/kf-art-002a/') && url.endsWith('.avif')).length;
const art002aWebp = [...files.keys()].filter((url) => url.includes('/media/kf-art-002a/') && url.endsWith('.webp')).length;
assert.equal(kf003bAvif, 37, 'KF-003B AVIF count');
assert.equal(kf003bWebp, 37, 'KF-003B WebP count');
assert.equal(art002aAvif, 9, 'KF-ART-002A AVIF count');
assert.equal(art002aWebp, 9, 'KF-ART-002A WebP count');

let audioBytes = 0;
let audioFiles = 0;
if (inventory.audioManifest) {
  const audioManifestURL = new URL(inventory.audioManifest, base);
  const audioManifestBytes = files.get(audioManifestURL.href);
  assert.ok(audioManifestBytes, 'Audio manifest must be hosted');
  const audioManifest = JSON.parse(audioManifestBytes);
  assert.equal(audioManifest.version, 1);
  assert.equal(audioManifest.sampleRate, 44100);
  assert.equal(audioManifest.payloadFiles, 18);
  assert.equal(audioManifest.payloadBytes, 341600);
  const audioEntries = Object.entries(audioManifest.files);
  assert.equal(audioEntries.length, 18);
  for (const [rel, meta] of audioEntries) {
    const wavURL = new URL(rel, audioManifestURL);
    const wav = files.get(wavURL.href);
    assert.ok(wav, rel);
    assert.equal(wav.length, meta.bytes, rel);
    assert.equal(sha256(wav), meta.sha256, rel);
    assert.equal(meta.license, 'CC0-1.0', rel);
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF', rel);
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE', rel);
    assert.equal(wav.readUInt16LE(20), 1, rel);
    assert.equal(wav.readUInt16LE(22), 1, rel);
    assert.equal(wav.readUInt32LE(24), 44100, rel);
    assert.equal(wav.readUInt16LE(34), 16, rel);
    audioBytes += wav.length;
    audioFiles += 1;
  }
  assert.equal(audioBytes, 341600);
}

const missingURL = new URL('models/missing-asset.glb', manifestURL);
const missing = await fetch(missingURL, { redirect: 'error' });
assert.equal(missing.status, 404);
assert.equal(missing.headers.get('content-type')?.split(';')[0], 'text/plain');
assert.doesNotMatch(await missing.text(), /<html|glTF/i);

const html = await readFile(new URL('index.html', dist), 'utf8');
assert.match(html, /type="module".*src="\/assets\/[^"]+\.js"/);
const assets = await readdir(new URL('assets/', dist));
assert.ok(assets.some((name) => name.endsWith('.woff2')), 'Compiled fonts');
const bundle = {};
for (const name of assets.filter((name) => /\.(js|css)$/.test(name))) {
  const bytes = await readFile(new URL(`assets/${name}`, dist));
  bundle[name] = { bytes: bytes.length, gzipLevel9: gzipSync(bytes, { level: 9 }).length };
}
const initialJs = Object.keys(bundle).filter((name) => name.startsWith('index-') && name.endsWith('.js'));
assert.equal(initialJs.length, 1);
assert.ok(bundle[initialJs[0]].gzipLevel9 <= 90_000, 'Initial JavaScript budget');
const runtimeJs = Object.keys(bundle).filter((name) => /^(viewportLifecycle|viewportAdapter|buildConfigRuntime|digest)-.+\.js$/.test(name));
assert.ok(runtimeJs.some((name) => name.startsWith('viewportAdapter-')), 'Lazy native runtime chunk');
assert.ok(runtimeJs.reduce((total, name) => total + bundle[name].gzipLevel9, 0) <= 220_000,
  'Aggregate lazy 3D JavaScript budget');
const allDistEntries = await readdir(dist, {recursive: true, withFileTypes: true});
let distBytes = 0;
for (const entry of allDistEntries.filter((entry) => entry.isFile())) {
  distBytes += (await readFile(join(entry.parentPath, entry.name))).length;
}
const evidence = {
  manifestURL: manifestURL.href,
  verifiedAssets: files.size,
  runtimeFiles: runtimeFiles.length,
  runtimeBytes: runtimeFiles.reduce((total, path) => total + files.get(path).length, 0),
  audioFiles,
  audioBytes,
  missingStatus: missing.status,
  bundle,
  distBytes,
};
await mkdir(output, { recursive: true });
await writeFile(new URL('assets.json', output), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
