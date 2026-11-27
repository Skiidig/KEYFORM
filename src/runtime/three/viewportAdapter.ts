import { WebGLRenderer } from 'three';
import type {
  BuildStudioViewportState, StationState, SwitchLabViewportState, ViewportMount,
  ViewportRuntimeAdapter, ViewportStationId,
} from '../types';
import { loadAssetPackage, type AssetPackage } from './assets';
import { NativeStage } from './NativeStage';

const switchVariants = { 'linear-45': 'linear45', 'tactile-58': 'tactile58', 'silent-50': 'silent50' } as const;

export function createNativeStage(container: HTMLElement, assets: AssetPackage, lifetime: ViewportMount) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { antialias: true, alpha: false });
  if (!context) throw new Error('WebGL2 context creation failed');
  let renderer: WebGLRenderer | undefined;
  try {
    renderer = new WebGLRenderer({ canvas, context, antialias: true, alpha: false });
    renderer.debug.onShaderError = () => { throw new Error('3D shader could not initialize'); };
    return new NativeStage(renderer, container, assets, lifetime);
  } catch (error) {
    renderer?.dispose();
    context.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
    throw error;
  }
}

export function createViewportAdapter<K extends ViewportStationId>(station: K): ViewportRuntimeAdapter<StationState[K]> {
  let current: StationState[K];
  let stage: NativeStage | undefined;
  let lifetime: ViewportMount;
  let ready = false;
  let reduced = false;
  let revision = 0;
  let appliedEnclosure: BuildStudioViewportState['config']['enclosure'] | undefined;
  let appliedSwitch: SwitchLabViewportState['switchProfile'] | undefined;
  let appliedHeroPose: SwitchLabViewportState['presentation'] | undefined;
  let hudMedia: MediaQueryList | undefined;
  let onHudMedia: ((e: MediaQueryListEvent) => void) | undefined;

  const syncStudioInset = (target: NativeStage, matches: boolean) => {
    target.setBottomInset(station === 'build-studio' && matches ? 72 : 0);
  };

  const apply = async (target: NativeStage, instant: boolean) => {
    const version = revision;
    if (station === 'switch-lab') {
      const { switchProfile, pressed, presentation, onTravelSample } = current as SwitchLabViewportState;
      target.setHeroTravelListener(onTravelSample ?? null);
      if (switchProfile !== appliedSwitch) {
        target.model.applyHeroSwitchVariant(switchVariants[switchProfile]);
        appliedSwitch = switchProfile;
      }
      target.setView('hero_switch', 'afterHours', 'heroSwitch', instant);
      if (presentation !== appliedHeroPose || instant) {
        target.setHeroPresentation(presentation, instant);
        appliedHeroPose = presentation;
      }
      target.setHeroPressed(pressed, instant);
    } else if (station === 'mechanical-anatomy') {
      const { exploded, focusedGroup } = current as StationState['mechanical-anatomy'];
      target.setView(exploded ? 'exploded' : 'combined', 'formFunction', exploded ? 'exploded' : 'threeQuarter', instant);
      target.setFocusedGroup(exploded ? focusedGroup : null);
    } else {
      const { config, cameraPreset } = current as BuildStudioViewportState;
      if (config.enclosure !== appliedEnclosure) {
        target.model.applyCasePreset(config.enclosure);
        appliedEnclosure = config.enclosure;
      }
      if ((cameraPreset === 'rear-usb' || cameraPreset === 'exploded') && !target.model.isInternalLoaded()) {
        await target.model.loadInternal();
        if (lifetime.signal.aborted || version !== revision) return;
      }
      switch (cameraPreset) {
        case 'exploded': target.setView('exploded', 'formFunction', 'exploded', instant); break;
        case 'rear-usb': target.setView('combined', 'atelier', 'rearUsbc', instant); break;
        case 'after-hours-front': target.setView('exterior', 'afterHours', 'threeQuarter', instant); break;
        default: target.setView('exterior', 'atelier', 'threeQuarter', instant);
      }
    }
  };

  return {
    async mount(container, initial, context) {
      current = initial;
      lifetime = context;
      reduced = context.reducedMotion;
      context.progress('Checking 3D assets…');
      let failure: Parameters<ViewportMount['fail']>[0] = 'asset';
      try {
        const assets = await loadAssetPackage(context.signal);
        context.signal.throwIfAborted();
        failure = 'renderer';
        const target = createNativeStage(container, assets, { ...context, reducedMotion: reduced });
        stage = target;
        if (station === 'build-studio') {
          hudMedia = matchMedia('(min-width: 640px)');
          syncStudioInset(target, hudMedia.matches);
          onHudMedia = (e) => syncStudioInset(target, e.matches);
          hudMedia.addEventListener('change', onHudMedia);
        }
        failure = 'asset';
        await target.setQuality(matchMedia('(max-width: 767px)').matches ? 'balanced' : 'standard');
        context.progress('Loading 3D preview…');
        if (station === 'switch-lab') {
          await target.model.loadHeroSwitch();
        } else {
          const { legend } = await target.model.loadExteriorWithLegend();
          if (!legend) throw new Error('Required keycap legend unavailable');
          if (station === 'mechanical-anatomy') await target.model.loadInternal();
        }
        let snapshot: number;
        do {
          snapshot = revision;
          context.signal.throwIfAborted();
          await apply(target, true);
        } while (snapshot !== revision);
        context.signal.throwIfAborted();
        failure = 'renderer';
        target.present();
        ready = true;
      } catch {
        if (!context.signal.aborted) context.fail(failure);
      }
    },
    update(next) {
      current = next;
      revision++;
      if (stage && ready) void apply(stage, false).catch(() => {
        if (!lifetime.signal.aborted) lifetime.fail('asset');
      });
    },
    setReducedMotion(value) {
      reduced = value;
      stage?.setReducedMotion(value);
    },
    resetView() {
      stage?.resetView();
    },
    dispose() {
      if (hudMedia && onHudMedia) {
        hudMedia.removeEventListener('change', onHudMedia);
        hudMedia = undefined;
        onHudMedia = undefined;
      }
      stage?.dispose();
      stage = undefined;
      ready = false;
    },
  };
}
