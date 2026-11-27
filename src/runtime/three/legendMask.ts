/**
 * KF-003C-B2.2 — cap-surface legend mask adapter.
 *
 * Reused verbatim (modulo import paths) from the verified B2.1 production
 * candidate (`runtime/legend-mask.ts`). The B2.2 runtime does not fork the
 * shader logic: the stripped exterior caps carry no glyph geometry, so the
 * glyph is sampled from a linear R8 atlas in the cap fragment shader, gated to
 * the crown, with a derivative-LOD clamp that keeps mip bleeding off the quads.
 *
 * Contract (enforced at attach time):
 *   - mapping schema `kf01-legend-mask/1`
 *   - mapping `assetVersion` === `manifest.asset_version`
 *   - 101 unique original glyph sources, 81 canonical keys, exactly one blank
 *     key and that blank key is `Space`
 *   - the exterior partition is stripped: any `kf01Role === 'keycap_legend'`
 *     node is a hard error
 *   - every bound instance's `semantic.nodeName` equals `mapping.keys[id].capNode`
 */
import * as THREE from 'three';
import type { ProductionScene } from './ProductionScene';
import type { InstanceBatch } from './instancing';

type Rect = [number, number, number, number];
type Entry = {
  uvRect: Rect;
  localBoundsXZ: Rect;
  crownMinY: number;
  sourceNodes: string[];
  capNode: string;
  blank: boolean;
};

type LegendHost = Pick<ProductionScene, 'keyboardRoot' | 'manifest' | 'getKeyColorOverrides' | 'setKeyColorOverride'> & {
  getInstanceBatch(mesh: THREE.InstancedMesh): InstanceBatch | undefined;
};

export type Inventory = {
  resolution: number;
  file: string;
  packing: { maxSampleMip: number };
  keys: Record<string, Entry>;
  schema: 'kf01-legend-mask/1';
  assetVersion: string;
  textureSha256: string;
  material: { id: string; linearColor: [number, number, number]; roughness: number; metalness: number };
};

export async function readLegendTexture(png: ArrayBuffer, size: number) {
  const blob = new Blob([png], { type: 'image/png' });
  const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none' });
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  try {
    if (!ctx || bitmap.width !== size || bitmap.height !== size) throw new Error('Invalid legend atlas');
    ctx.drawImage(bitmap, 0, 0);
  } finally {
    bitmap.close();
  }
  const rgba = ctx.getImageData(0, 0, size, size).data;
  const pixels = new Uint8Array(size * size);
  for (let i = 0; i < pixels.length; i++) pixels[i] = rgba[4 * i];
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RedFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function attachLegendMask(prod: LegendHost, inventory: Inventory, texture: THREE.DataTexture) {
  if (inventory.schema !== 'kf01-legend-mask/1' || inventory.assetVersion !== prod.manifest.asset_version) {
    throw new Error('Legend and exterior asset versions disagree');
  }
  const sources = Object.values(inventory.keys).flatMap((entry) => entry.sourceNodes);
  if (sources.length !== 101 || new Set(sources).size !== 101 || !inventory.keys.Space?.blank
      || Object.values(inventory.keys).filter((entry) => entry.blank).length !== 1
      || Object.keys(inventory.keys).length !== prod.manifest.keys.length) throw new Error('Incomplete legend mapping');
  const color = { value: new THREE.Color().fromArray(inventory.material.linearColor) };
  const debugMask = { value: 0 };
  const meshes: THREE.Mesh[] = [];
  const materials = new Map<THREE.MeshStandardMaterial, {
    onBeforeCompile: THREE.MeshStandardMaterial['onBeforeCompile'];
    customProgramCacheKey: THREE.MeshStandardMaterial['customProgramCacheKey'];
  }>();
  const keys = new Map<string, { mesh: THREE.Mesh; index: number }>();
  const geometry = new Map<THREE.Mesh, THREE.BufferGeometry>();
  const capBase = new Map<THREE.Mesh, THREE.Color>();
  const pixelIds = new Map(prod.manifest.keys.map(({ id }, index) => [id, index + 1]));

  type LegendUniformRefs = {
    kfLegendMask: { value: THREE.Texture };
    kfLegendColor: { value: THREE.Color };
    kfLegendDebug: { value: number };
    kfLegendSize: { value: number };
    kfLegendMaxMip: { value: number };
    kfLegendPbr: { value: THREE.Vector2 };
  };

  function patch(mat: THREE.MeshStandardMaterial) {
    if (materials.has(mat)) return;
    // Reuse a persistent uniform-holder object on mat.userData so Three.js r180's
    // per-material WebGLProgram cache always reads the active legend atlas texture
    // and resolution after 2048 <-> 1024 tier swaps (never a disposed texture).
    let refs = mat.userData.kfLegendUniformRefs as LegendUniformRefs | undefined;
    if (!refs) {
      refs = {
        kfLegendMask: { value: texture },
        kfLegendColor: color,
        kfLegendDebug: debugMask,
        kfLegendSize: { value: inventory.resolution },
        kfLegendMaxMip: { value: inventory.packing.maxSampleMip },
        kfLegendPbr: { value: new THREE.Vector2(inventory.material.roughness, inventory.material.metalness) },
      };
      mat.userData.kfLegendUniformRefs = refs;
    } else {
      refs.kfLegendMask.value = texture;
      refs.kfLegendColor.value.copy(color.value);
      refs.kfLegendDebug.value = debugMask.value;
      refs.kfLegendSize.value = inventory.resolution;
      refs.kfLegendMaxMip.value = inventory.packing.maxSampleMip;
      refs.kfLegendPbr.value.set(inventory.material.roughness, inventory.material.metalness);
    }

    const original = { onBeforeCompile: mat.onBeforeCompile, customProgramCacheKey: mat.customProgramCacheKey };
    materials.set(mat, original);
    const cacheKey = mat.customProgramCacheKey();
    mat.customProgramCacheKey = () => cacheKey + '|kf-b21-cap-mask-1';
    const boundRefs = refs;
    mat.onBeforeCompile = function (shader, renderer) {
      original.onBeforeCompile.call(this, shader, renderer);
      shader.uniforms.kfLegendMask = boundRefs.kfLegendMask;
      shader.uniforms.kfLegendColor = boundRefs.kfLegendColor;
      shader.uniforms.kfLegendDebug = boundRefs.kfLegendDebug;
      shader.uniforms.kfLegendSize = boundRefs.kfLegendSize;
      shader.uniforms.kfLegendMaxMip = boundRefs.kfLegendMaxMip;
      shader.uniforms.kfLegendPbr = boundRefs.kfLegendPbr;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `
        #include <common>
        attribute vec4 kfLegendRect;
        attribute vec4 kfLegendBounds;
        attribute vec2 kfLegendCrownMin;
        varying vec4 vKfLegendRect;
        varying vec3 vKfLegendPosition;
        varying vec2 vKfLegendLocal;
        varying vec3 vKfLegendCrown;
      `).replace('#include <begin_vertex>', `
        #include <begin_vertex>
        vKfLegendRect = kfLegendRect;
        vKfLegendPosition = position;
        vKfLegendLocal = (position.xz - kfLegendBounds.xy) / (kfLegendBounds.zw - kfLegendBounds.xy);
        vKfLegendCrown = vec3(kfLegendCrownMin.x, normal.y, kfLegendCrownMin.y);
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
        #include <common>
        uniform sampler2D kfLegendMask;
        uniform vec3 kfLegendColor;
        uniform float kfLegendDebug;
        uniform float kfLegendSize;
        uniform float kfLegendMaxMip;
        uniform vec2 kfLegendPbr;
        varying vec4 vKfLegendRect;
        varying vec3 vKfLegendPosition;
        varying vec2 vKfLegendLocal;
        varying vec3 vKfLegendCrown;
      `).replace('#include <color_fragment>', `
        #include <color_fragment>
        vec2 kfUv = vKfLegendRect.xy + vKfLegendRect.zw * vKfLegendLocal;
        vec2 kfDx = dFdx(kfUv);
        vec2 kfDy = dFdy(kfUv);
        float kfFootprint = max(length(kfDx), length(kfDy)) * kfLegendSize;
        float kfMaxFootprint = exp2(kfLegendMaxMip);
        float kfGradientScale = min(1.0, kfMaxFootprint / max(kfFootprint, 0.001));
        float kfMask = 0.0;
        if (vKfLegendRect.z > 0.0 && vKfLegendPosition.y > vKfLegendCrown.x
            && vKfLegendCrown.y > 0.4 && all(greaterThanEqual(vKfLegendLocal, vec2(0.0)))
            && all(lessThanEqual(vKfLegendLocal, vec2(1.0)))) {
          kfMask = textureGrad(kfLegendMask, kfUv, kfDx * kfGradientScale, kfDy * kfGradientScale).r;
          kfMask *= 1.0 - smoothstep(kfMaxFootprint, 2.0 * kfMaxFootprint, kfFootprint);
        }
        diffuseColor.rgb = mix(diffuseColor.rgb, kfLegendColor, kfMask);
      `).replace('#include <roughnessmap_fragment>', `
        #include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, kfLegendPbr.x, kfMask);
      `).replace('#include <metalnessmap_fragment>', `
        #include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, kfLegendPbr.y, kfMask);
      `).replace('#include <dithering_fragment>', `
        #include <dithering_fragment>
        if (kfLegendDebug > 0.5) {
          float kfCode = vKfLegendCrown.z / 255.0;
          gl_FragColor = vec4(kfMask, kfCode, 1.0 - kfCode, 1.0);
        }
      `);
    };
    mat.needsUpdate = true;
  }

  function attributes(mesh: THREE.Mesh, ids: (string | null)[], instanced: boolean) {
    const original = mesh.geometry;
    const target = new THREE.BufferGeometry();
    target.index = original.index;
    for (const [name, attribute] of Object.entries(original.attributes)) target.setAttribute(name, attribute);
    for (const group of original.groups) target.addGroup(group.start, group.count, group.materialIndex);
    target.setDrawRange(original.drawRange.start, original.drawRange.count);
    target.boundingBox = original.boundingBox?.clone() ?? null;
    target.boundingSphere = original.boundingSphere?.clone() ?? null;
    const count = instanced ? ids.length : original.attributes.position.count;
    const rects = new Float32Array(count * 4);
    const bounds = new Float32Array(count * 4);
    const gates = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const id = ids[instanced ? i : 0];
      const entry = id ? inventory.keys[id] : undefined;
      rects.set(entry?.uvRect ?? [0, 0, 0, 0], i * 4);
      bounds.set(entry?.localBoundsXZ ?? [0, 0, 1, 1], i * 4);
      gates[i * 2] = entry?.crownMinY ?? 1;
      gates[i * 2 + 1] = id ? pixelIds.get(id)! : 0;
    }
    const Attribute = instanced ? THREE.InstancedBufferAttribute : THREE.BufferAttribute;
    target.setAttribute('kfLegendRect', new Attribute(rects, 4));
    target.setAttribute('kfLegendBounds', new Attribute(bounds, 4));
    target.setAttribute('kfLegendCrownMin', new Attribute(gates, 2));
    geometry.set(mesh, original);
    mesh.geometry = target;
    meshes.push(mesh);
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const base = mat.userData.kf003cInstanceBaseColor as number[] | undefined;
    capBase.set(mesh, instanced && base ? new THREE.Color().fromArray(base) : mat.color.clone());
    patch(mat);
  }

  const batches = new Set<THREE.InstancedMesh>();
  const bindings: { mesh: THREE.Mesh; ids: string[]; instanced: boolean }[] = [];
  function bind(id: string, nodeName: string, mesh: THREE.Mesh, index: number) {
    if (keys.has(id) || inventory.keys[id]?.capNode !== nodeName) throw new Error(`Invalid legend binding: ${id}`);
    keys.set(id, { mesh, index });
  }
  prod.keyboardRoot.traverse((object: THREE.Object3D) => {
    if (object.userData.kf01Role === 'keycap_legend') throw new Error('Expected a stripped exterior partition');
    const mesh = object as THREE.InstancedMesh;
    if (mesh.isInstancedMesh) {
      const batch = prod.getInstanceBatch(mesh);
      if (!batch || batch.instances[0].semantic.role !== 'keycap') return;
      const entries = batch.instances.map(({ semantic, index }) => {
        if (!semantic.keyId) throw new Error('Keycap instance lost its canonical ID');
        bind(semantic.keyId, semantic.nodeName, mesh, index);
        return semantic.keyId;
      });
      batches.add(mesh);
      bindings.push({ mesh, ids: entries, instanced: true });
    } else if ((object as THREE.Mesh).isMesh && object.visible && object.userData.kf01Role === 'keycap') {
      const id = object.userData.keyId as string;
      bind(id, object.name, object as THREE.Mesh, 0);
      bindings.push({ mesh, ids: [id], instanced: false });
    }
  });
  if (keys.size !== Object.keys(inventory.keys).length) throw new Error('Keycap mapping incomplete');
  for (const binding of bindings) attributes(binding.mesh, binding.ids, binding.instanced);

  return {
    keys, color, debugMask, pixelIds, capDrawObjects: meshes.length, capBatches: batches.size,
    texture: {
      format: texture.format,
      generateMipmaps: texture.generateMipmaps,
      minFilter: texture.minFilter,
      // GL generates the chain at upload for DataTexture; report the level count
      // the sampler can actually address instead of the (always empty) JS array.
      mipLevels: texture.generateMipmaps ? Math.floor(Math.log2(inventory.resolution)) + 1 : 1,
      colorSpace: texture.colorSpace === THREE.NoColorSpace ? 'NoColorSpace' : String(texture.colorSpace),
      compressed: Boolean((texture as unknown as THREE.CompressedTexture).isCompressedTexture),
    },
    setKeyColor(id: string, hex: string | null) {
      const result = prod.setKeyColorOverride(id, hex);
      const entry = keys.get(id);
      if (entry) patch(entry.mesh.material as THREE.MeshStandardMaterial);
      return result;
    },
    setSharedCapColor(hex: string | null) {
      const overrides = prod.getKeyColorOverrides();
      const shared = hex ? new THREE.Color(hex) : null;
      for (const mesh of batches) {
        const capColor = shared ?? capBase.get(mesh)!;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.userData.kf003cInstanceBaseColor = capColor.toArray();
        const batch = prod.getInstanceBatch(mesh)!;
        batch.instances.forEach(({ semantic, index }) => {
          const override = semantic.keyId && overrides[semantic.keyId];
          if (!override) mesh.setColorAt(index, capColor);
        });
        mesh.instanceColor!.needsUpdate = true;
      }
      for (const [id, { mesh }] of keys) {
        if ((mesh as THREE.InstancedMesh).isInstancedMesh) continue;
        const capColor = shared ?? capBase.get(mesh)!;
        if (mesh.userData.kf003cCapOverride) mesh.userData.kf003cCapBaseColor = capColor.toArray();
        if (!overrides[id]) (mesh.material as THREE.MeshStandardMaterial).color.copy(capColor);
      }
    },
    dispose() {
      for (const [mesh, original] of geometry) {
        // Buffer attributes are shared with the originals. Disposal is at teardown.
        mesh.geometry.dispose();
        mesh.geometry = original;
      }
      for (const [mat, hooks] of materials) {
        Object.assign(mat, hooks);
        mat.needsUpdate = true;
      }
      texture.dispose();
    },
  };
}

export type LegendMaskRuntime = Awaited<ReturnType<typeof attachLegendMask>>;
