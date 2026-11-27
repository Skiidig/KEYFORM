/**
 * KF-003C-B3 — Grounding & Contact Shadow System (Phase 5).
 *
 * Solves the floating-product appearance with zero per-frame shadow regeneration:
 *   - `procedural` (Balanced tier): analytical multi-lobe soft contact shadow in a single
 *     lightweight shader draw call (0 extra render passes, 0 extra textures, 1 draw call,
 *     2 triangles).
 *   - `cached` (Standard & High tiers): world-space soft contact shadow baked ONCE into a
 *     compact 512x512 offscreen render target via a downward orthographic capture + separable
 *     Gaussian blur. Sampled in two lobes (tight contact AO + directional softbox penumbra).
 *     Never re-baked on camera orbit, pan, zoom, material swap, individual keypresses, or idle.
 *
 * Color-pipeline invariant:
 *   The ground plane alpha-blends directly over `scene.background` (which Three.js clears in
 *   sRGB without tone mapping), so it deliberately outputs sRGB shadow/glow directly with ZERO
 *   tone-mapping mismatch — guaranteeing an invisible horizon seam from every camera angle
 *   (including Side 6.5° and Rear USB-C).
 *
 * Exploded view grounding:
 *   Tracks the bottom chassis Y position (`Math.min(0, bottomChassisOffsetY) - 0.0004`)
 *   so the bottom enclosure is NEVER clipped by the floor plane at any explode progress.
 */
import * as THREE from 'three';
import { STUDIO_PROFILES, type StudioProfileId } from './studioProfiles';

export type ContactShadowMode = 'procedural' | 'cached';

export interface ContactShadowTelemetry {
  mode: ContactShadowMode;
  enabled: boolean;
  bakeCount: number;
  lastBakeMs: number;
  floorY: number;
  textureResolution: number;
  drawCallsPerFrame: number;
  trianglesPerFrame: number;
}

const SHADOW_RES = 512;

const GROUND_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GROUND_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uFloorGlow;      // sRGB radial studio tabletop glow (used on dark After Hours)
  uniform float uFloorGlowAmt;  // 0 on light studios (pure seamless shadow), >0 on After Hours
  uniform vec3 uShadowColor;    // sRGB shadow tint
  uniform float uShadowOpacity;
  uniform float uShadowEnabled;
  uniform float uUseCachedMap;
  uniform sampler2D uShadowMap;
  uniform vec2 uHalfExtents;    // analytical footprint half-size in UV space
  uniform float uCornerRadius;  // rounded corner radius in UV space
  uniform float uExplode;       // 0..1 softens shadow gracefully
  uniform float uIsHero;
  varying vec2 vUv;

  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + vec2(r);
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  float sampleBaked(vec2 uv) {
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;
    vec2 edge = smoothstep(vec2(0.0), vec2(0.06), uv) * smoothstep(vec2(0.0), vec2(0.06), 1.0 - uv);
    return texture2D(uShadowMap, uv).r * edge.x * edge.y;
  }

  void main() {
    vec2 p = vUv - 0.5;
    float radial = length(p * vec2(1.0, 1.2));

    // Subtle matte studio tabletop light pool on dark After Hours (invisible on light studios)
    float glowAlpha = uFloorGlowAmt * pow(1.0 - smoothstep(0.05, 0.48, radial), 1.65);

    float shadow = 0.0;
    if (uShadowEnabled > 0.5) {
      if (uUseCachedMap > 0.5) {
        // Dual-lobe cached contact shadow:
        //   1. Tight contact AO directly under chassis / switch base
        //   2. Broad directional softbox penumbra offset slightly away from key light
        vec2 mapUv = (vUv - 0.5) / 0.58 + 0.5;
        float tightRaw = sampleBaked(mapUv);
        float tight = pow(clamp(tightRaw, 0.0, 1.0), 0.68);

        vec2 dirOff = uIsHero > 0.5 ? vec2(-0.024, -0.022) : vec2(-0.018, -0.018);
        float spread = uIsHero > 0.5 ? 0.045 : (0.036 + 0.028 * uExplode);
        float penumbra = 0.0;
        penumbra += sampleBaked(mapUv + dirOff + vec2( spread,  0.0));
        penumbra += sampleBaked(mapUv + dirOff + vec2(-spread,  0.0));
        penumbra += sampleBaked(mapUv + dirOff + vec2( 0.0,  spread));
        penumbra += sampleBaked(mapUv + dirOff + vec2( 0.0, -spread));
        penumbra += sampleBaked(mapUv + dirOff + vec2( spread * 0.7,  spread * 0.7));
        penumbra += sampleBaked(mapUv + dirOff + vec2(-spread * 0.7, -spread * 0.7));
        penumbra += sampleBaked(mapUv + dirOff + vec2( spread * 0.7, -spread * 0.7));
        penumbra += sampleBaked(mapUv + dirOff + vec2(-spread * 0.7,  spread * 0.7));
        penumbra *= 0.125;

        shadow = clamp(tight * 0.82 + pow(penumbra, 0.85) * 0.46, 0.0, 1.0);
      } else {
        // Balanced tier: analytical multi-lobe soft contact shadow (0 extra passes)
        vec2 offset = uIsHero > 0.5 ? vec2(0.016, 0.014) : vec2(0.012, 0.012);
        float dContact = sdRoundedBox(p - offset * 0.18, uHalfExtents, uCornerRadius);
        float dPenumbra = sdRoundedBox(p - offset, uHalfExtents * (1.03 + 0.07 * uExplode), uCornerRadius * 1.45);

        float tight = 1.0 - smoothstep(-0.004, 0.024 + 0.014 * uExplode, dContact);
        float soft = 1.0 - smoothstep(-0.008, 0.095 + 0.045 * uExplode, dPenumbra);
        shadow = clamp(tight * 0.84 + soft * 0.44, 0.0, 1.0);
      }
    }

    float shadowAlpha = clamp(shadow * uShadowOpacity, 0.0, 0.94);

    // Porter-Duff source-over composite: shadow over optional dark-studio tabletop glow
    float outAlpha = shadowAlpha + glowAlpha * (1.0 - shadowAlpha);
    if (outAlpha < 0.002) discard;
    vec3 outColor = (uShadowColor * shadowAlpha + uFloorGlow * glowAlpha * (1.0 - shadowAlpha)) / outAlpha;

    // Output directly in sRGB to blend invisibly into scene.background (zero horizon seam)
    gl_FragColor = vec4(outColor, outAlpha);
  }
`;

// Height-attenuated shadow silhouette shader used during one-shot cached shadow baking.
const DEPTH_SHADOW_VERTEX = /* glsl */ `
  varying float vWorldY;
  void main() {
    vec4 mvPos = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      mvPos = instanceMatrix * mvPos;
    #endif
    vec4 worldPos = modelMatrix * mvPos;
    vWorldY = worldPos.y;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const DEPTH_SHADOW_FRAGMENT = /* glsl */ `
  uniform float uFloorY;
  uniform float uMaxHeight;
  varying float vWorldY;
  void main() {
    float h = max(0.0, vWorldY - uFloorY);
    float t = clamp(h / max(uMaxHeight, 0.001), 0.0, 1.0);
    // Rich tight contact occlusion near floor, gentle ambient falloff for upper layers
    float density = mix(1.0, 0.34, smoothstep(0.0, 0.72, t));
    gl_FragColor = vec4(density, density, density, 1.0);
  }
`;

const BLUR_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const BLUR_FRAGMENT = /* glsl */ `
  uniform sampler2D uInput;
  uniform vec2 uStep;
  varying vec2 vUv;
  void main() {
    float sum = 0.0;
    sum += texture2D(uInput, vUv - uStep * 4.0).r * 0.048;
    sum += texture2D(uInput, vUv - uStep * 3.0).r * 0.088;
    sum += texture2D(uInput, vUv - uStep * 2.0).r * 0.128;
    sum += texture2D(uInput, vUv - uStep * 1.0).r * 0.156;
    sum += texture2D(uInput, vUv).r * 0.160;
    sum += texture2D(uInput, vUv + uStep * 1.0).r * 0.156;
    sum += texture2D(uInput, vUv + uStep * 2.0).r * 0.128;
    sum += texture2D(uInput, vUv + uStep * 3.0).r * 0.088;
    sum += texture2D(uInput, vUv + uStep * 4.0).r * 0.048;
    gl_FragColor = vec4(sum, sum, sum, 1.0);
  }
`;

function hexToSrgbVec3(hex: string): THREE.Vector3 {
  const n = parseInt(hex.replace('#', ''), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export class StudioGroundSystem {
  readonly group = new THREE.Group();
  readonly plane: THREE.Mesh;

  private planeGeom: THREE.PlaneGeometry;
  private planeMat: THREE.ShaderMaterial;

  private rtA: THREE.WebGLRenderTarget | null = null;
  private rtB: THREE.WebGLRenderTarget | null = null;
  private dummyTex: THREE.DataTexture;
  private shadowCam: THREE.OrthographicCamera;
  private depthMat: THREE.ShaderMaterial | null = null;
  private blurScene: THREE.Scene | null = null;
  private blurCam: THREE.OrthographicCamera | null = null;
  private blurGeom: THREE.PlaneGeometry | null = null;
  private blurMat: THREE.ShaderMaterial | null = null;

  private mode: ContactShadowMode = 'cached';
  private enabled = true;
  private isHero = false;
  private floorY = -0.0004;
  private explodeProgress = 0;
  private bakeCount = 0;
  private lastBakeMs = 0;
  private hasBaked = false;
  private disposed = false;

  constructor(initialProfile: StudioProfileId = 'atelier') {
    this.group.name = 'KF003C_StudioGroundGroup';

    this.dummyTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
    this.dummyTex.needsUpdate = true;

    this.planeGeom = new THREE.PlaneGeometry(1, 1);
    const prof = STUDIO_PROFILES[initialProfile];
    const isDark = initialProfile === 'afterHours';
    this.planeMat = new THREE.ShaderMaterial({
      vertexShader: GROUND_VERTEX_SHADER,
      fragmentShader: GROUND_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uFloorGlow: { value: hexToSrgbVec3(prof.floorCenterHex) },
        uFloorGlowAmt: { value: isDark ? 0.58 : 0.0 },
        uShadowColor: { value: hexToSrgbVec3(prof.shadowColorHex) },
        uShadowOpacity: { value: prof.shadowOpacity },
        uShadowEnabled: { value: 1.0 },
        uUseCachedMap: { value: 0.0 },
        uShadowMap: { value: this.dummyTex },
        uHalfExtents: { value: new THREE.Vector2(0.178, 0.096) },
        uCornerRadius: { value: 0.014 },
        uExplode: { value: 0.0 },
        uIsHero: { value: 0.0 },
      },
    });

    this.plane = new THREE.Mesh(this.planeGeom, this.planeMat);
    this.plane.name = 'KF003C_StudioGround';
    this.plane.rotation.x = -Math.PI / 2;
    this.plane.position.set(0, this.floorY, 0);
    this.plane.scale.set(0.92, 0.72, 1);
    this.plane.receiveShadow = false;
    this.plane.castShadow = false;
    this.plane.renderOrder = -1;
    this.plane.raycast = () => {};
    this.group.add(this.plane);

    this.shadowCam = new THREE.OrthographicCamera(-0.26, 0.26, 0.21, -0.21, 0.001, 0.8);
  }

  applyProfile(profileId: StudioProfileId): void {
    const prof = STUDIO_PROFILES[profileId];
    const isDark = profileId === 'afterHours';
    (this.planeMat.uniforms.uFloorGlow.value as THREE.Vector3).copy(hexToSrgbVec3(prof.floorCenterHex));
    this.planeMat.uniforms.uFloorGlowAmt.value = isDark ? 0.58 : 0.0;
    (this.planeMat.uniforms.uShadowColor.value as THREE.Vector3).copy(hexToSrgbVec3(prof.shadowColorHex));
    this.planeMat.uniforms.uShadowOpacity.value = prof.shadowOpacity;
  }

  setMode(mode: ContactShadowMode): void {
    this.mode = mode;
    if (mode === 'procedural') {
      this.planeMat.uniforms.uUseCachedMap.value = 0.0;
    } else if (this.hasBaked && this.rtA) {
      this.planeMat.uniforms.uShadowMap.value = this.rtA.texture;
      this.planeMat.uniforms.uUseCachedMap.value = 1.0;
    }
  }

  getMode(): ContactShadowMode {
    return this.mode;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.planeMat.uniforms.uShadowEnabled.value = enabled ? 1.0 : 0.0;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  updateLayout(opts: { isHero: boolean; explodeProgress: number; bottomOffsetY: number }): void {
    this.isHero = opts.isHero;
    this.explodeProgress = opts.explodeProgress;
    this.planeMat.uniforms.uIsHero.value = opts.isHero ? 1.0 : 0.0;
    this.planeMat.uniforms.uExplode.value = opts.explodeProgress;

    if (opts.isHero) {
      this.floorY = -0.0032;
      this.plane.position.set(0, this.floorY, 0);
      this.plane.scale.set(0.095, 0.095, 1);
      this.planeMat.uniforms.uHalfExtents.value.set(0.088, 0.088);
      this.planeMat.uniforms.uCornerRadius.value = 0.022;
    } else {
      this.floorY = Math.min(0, opts.bottomOffsetY) - 0.0004;
      this.plane.position.set(0, this.floorY, 0);
      this.plane.scale.set(0.92, 0.72, 1);
      this.planeMat.uniforms.uHalfExtents.value.set(0.178, 0.096);
      this.planeMat.uniforms.uCornerRadius.value = 0.014;
    }
  }

  private ensureCachedPipeline(): void {
    if (this.rtA) return;
    const opts: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false,
    };
    this.rtA = new THREE.WebGLRenderTarget(SHADOW_RES, SHADOW_RES, opts);
    this.rtB = new THREE.WebGLRenderTarget(SHADOW_RES, SHADOW_RES, {
      ...opts,
      depthBuffer: false,
    });

    this.depthMat = new THREE.ShaderMaterial({
      vertexShader: DEPTH_SHADOW_VERTEX,
      fragmentShader: DEPTH_SHADOW_FRAGMENT,
      uniforms: {
        uFloorY: { value: this.floorY },
        uMaxHeight: { value: 0.08 },
      },
      side: THREE.DoubleSide,
    });

    this.blurGeom = new THREE.PlaneGeometry(2, 2);
    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: BLUR_VERTEX,
      fragmentShader: BLUR_FRAGMENT,
      uniforms: {
        uInput: { value: this.rtA.texture },
        uStep: { value: new THREE.Vector2(1 / SHADOW_RES, 0) },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.blurScene = new THREE.Scene();
    this.blurScene.add(new THREE.Mesh(this.blurGeom, this.blurMat));
    this.blurCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  bakeCachedShadow(renderer: THREE.WebGLRenderer, productScene: THREE.Scene): void {
    if (this.disposed || this.mode !== 'cached' || !this.enabled) return;
    this.ensureCachedPipeline();
    if (!this.rtA || !this.rtB || !this.depthMat || !this.blurScene || !this.blurCam || !this.blurMat) return;

    const t0 = performance.now();

    const halfW = (this.plane.scale.x * 0.58) / 2;
    const halfH = (this.plane.scale.y * 0.58) / 2;
    this.shadowCam.left = -halfW;
    this.shadowCam.right = halfW;
    this.shadowCam.top = halfH;
    this.shadowCam.bottom = -halfH;
    this.shadowCam.near = 0.001;
    this.shadowCam.far = this.isHero ? 0.12 : 0.65;
    this.shadowCam.position.set(0, this.floorY + (this.isHero ? 0.055 : 0.36), 0);
    this.shadowCam.up.set(0, 0, -1);
    this.shadowCam.lookAt(0, this.floorY, 0);
    this.shadowCam.updateProjectionMatrix();
    this.shadowCam.updateMatrixWorld(true);

    this.depthMat.uniforms.uFloorY.value = this.floorY;
    this.depthMat.uniforms.uMaxHeight.value = this.isHero ? 0.032 : 0.055 + this.explodeProgress * 0.14;

    const prevTarget = renderer.getRenderTarget();
    const prevClearColor = new THREE.Color();
    renderer.getClearColor(prevClearColor);
    const prevClearAlpha = renderer.getClearAlpha();
    const prevShadowAuto = renderer.shadowMap.autoUpdate;
    const prevOverride = productScene.overrideMaterial;
    const prevBg = productScene.background;
    const prevGroundVisible = this.plane.visible;

    this.plane.visible = false;
    productScene.background = null;
    productScene.overrideMaterial = this.depthMat;
    renderer.shadowMap.autoUpdate = false;

    renderer.setRenderTarget(this.rtA);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.render(productScene, this.shadowCam);

    productScene.overrideMaterial = prevOverride;
    productScene.background = prevBg;
    this.plane.visible = prevGroundVisible;

    // Tight soft blur preserves crisp grounded contact right beneath the chassis feet,
    // while the ground shader adds the broader directional softbox penumbra.
    const spread1 = (this.isHero ? 2.2 : 2.1 + this.explodeProgress * 1.4) / SHADOW_RES;
    const spread2 = (this.isHero ? 1.2 : 1.1 + this.explodeProgress * 0.7) / SHADOW_RES;

    this.blurMat.uniforms.uInput.value = this.rtA.texture;
    this.blurMat.uniforms.uStep.value.set(spread1, 0);
    renderer.setRenderTarget(this.rtB);
    renderer.render(this.blurScene, this.blurCam);

    this.blurMat.uniforms.uInput.value = this.rtB.texture;
    this.blurMat.uniforms.uStep.value.set(0, spread1);
    renderer.setRenderTarget(this.rtA);
    renderer.render(this.blurScene, this.blurCam);

    this.blurMat.uniforms.uInput.value = this.rtA.texture;
    this.blurMat.uniforms.uStep.value.set(spread2, 0);
    renderer.setRenderTarget(this.rtB);
    renderer.render(this.blurScene, this.blurCam);

    this.blurMat.uniforms.uInput.value = this.rtB.texture;
    this.blurMat.uniforms.uStep.value.set(0, spread2);
    renderer.setRenderTarget(this.rtA);
    renderer.render(this.blurScene, this.blurCam);

    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevClearColor, prevClearAlpha);
    renderer.shadowMap.autoUpdate = prevShadowAuto;

    this.hasBaked = true;
    this.bakeCount += 1;
    this.lastBakeMs = Number((performance.now() - t0).toFixed(2));
    this.planeMat.uniforms.uShadowMap.value = this.rtA.texture;
    this.planeMat.uniforms.uUseCachedMap.value = 1.0;
  }

  getTelemetry(): ContactShadowTelemetry {
    return {
      mode: this.mode,
      enabled: this.enabled,
      bakeCount: this.bakeCount,
      lastBakeMs: this.lastBakeMs,
      floorY: Number(this.floorY.toFixed(5)),
      textureResolution: this.rtA ? SHADOW_RES : 0,
      drawCallsPerFrame: 1,
      trianglesPerFrame: 2,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.plane.removeFromParent();
    this.planeGeom.dispose();
    this.planeMat.dispose();
    this.dummyTex.dispose();
    this.rtA?.dispose();
    this.rtB?.dispose();
    this.depthMat?.dispose();
    this.blurGeom?.dispose();
    this.blurMat?.dispose();
    this.blurScene?.clear();
    this.rtA = null;
    this.rtB = null;
    this.depthMat = null;
    this.blurGeom = null;
    this.blurMat = null;
    this.blurScene = null;
    this.group.clear();
  }
}
