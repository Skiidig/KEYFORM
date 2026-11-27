import React, { useEffect, useRef, useState } from 'react';
import { MechanicalAudioEngine } from './engine';
import type { SwitchProfileId } from './types';

export interface SwitchAudioBridge {
  onPhase(phase: 'idle' | 'pressing' | 'bottomed' | 'releasing'): void;
  releaseAll(): void;
}

interface SwitchLabAudioPanelProps {
  profile: SwitchProfileId;
  bridgeRef: React.MutableRefObject<SwitchAudioBridge | null>;
  pendingContextRef: React.MutableRefObject<AudioContext | null>;
  onDisable: () => void;
}

export const SwitchLabAudioPanel: React.FC<SwitchLabAudioPanelProps> = ({
  profile,
  bridgeRef,
  pendingContextRef,
  onDisable,
}) => {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [error, setError] = useState('');
  const engineRef = useRef<MechanicalAudioEngine | null>(null);
  const reachedBottomRef = useRef(false);
  const opRef = useRef(0);

  useEffect(() => {
    const handedCtx = pendingContextRef.current;
    pendingContextRef.current = null;
    const engine = new MechanicalAudioEngine({
      initialProfile: profile,
      initialVolume: 0.6,
      contextFactory: handedCtx
        ? () => handedCtx
        : () => new AudioContext({ latencyHint: 'interactive' }),
    });
    engineRef.current = engine;
    const op = ++opRef.current;

    bridgeRef.current = {
      onPhase(phase) {
        if (phase === 'bottomed' && !reachedBottomRef.current) {
          reachedBottomRef.current = true;
          engine.keyDown('hero-switch', 'standard');
        } else if (phase === 'idle' && reachedBottomRef.current) {
          reachedBottomRef.current = false;
          engine.keyUp('hero-switch', 'standard');
        }
      },
      releaseAll() {
        reachedBottomRef.current = false;
        engine.releaseAll();
      },
    };

    const boot = async () => {
      try {
        await engine.enable();
        if (op !== opRef.current) return;
        await engine.loadSamples();
        if (op !== opRef.current) return;
        setState('ready');
      } catch {
        if (op !== opRef.current) return;
        engine.disable();
        setState('error');
        setError('Sound preview unavailable; visual actuation remains active.');
      }
    };
    void boot();

    return () => {
      opRef.current += 1;
      bridgeRef.current = null;
      reachedBottomRef.current = false;
      void engine.dispose();
      engineRef.current = null;
    };
    // Mount once per explicit activation; profile changes sync in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reachedBottomRef.current = false;
    const engine = engineRef.current;
    if (!engine) return;
    engine.releaseAll();
    engine.setProfile(profile);
  }, [profile]);

  const handleMute = () => {
    const next = !muted;
    setMuted(next);
    engineRef.current?.setMuted(next);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value);
    setVolume(next);
    engineRef.current?.setVolume(next);
  };

  const handleRetry = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    const op = ++opRef.current;
    setState('loading');
    setError('');
    try {
      await engine.enable();
      if (op !== opRef.current) return;
      await engine.loadSamples();
      if (op !== opRef.current) return;
      engine.setMuted(muted);
      setState('ready');
    } catch {
      if (op !== opRef.current) return;
      engine.disable();
      setState('error');
      setError('Sound preview unavailable; visual actuation remains active.');
    }
  };

  return (
    <div className="kf-audio-bar" role="region" aria-label="Representative sound preview">
      <div className="kf-audio-bar__controls">
        <button
          type="button"
          className="kf-audio-btn"
          aria-pressed={state === 'ready' || state === 'loading'}
          onClick={state === 'error' ? () => void handleRetry() : onDisable}
        >
          {state === 'ready'
            ? 'Disable sound'
            : state === 'loading'
              ? 'Cancel audio'
              : 'Retry sound'}
        </button>
        {state === 'error' && (
          <button type="button" className="kf-audio-btn kf-audio-btn--quiet" onClick={onDisable}>
            Close
          </button>
        )}
        {state === 'ready' && (
          <>
            <button
              type="button"
              className="kf-audio-btn kf-audio-btn--quiet"
              aria-pressed={muted}
              onClick={handleMute}
            >
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <label className="kf-audio-vol">
              <span className="sr-only">Sound volume</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolume}
                aria-label="Sound volume"
              />
            </label>
          </>
        )}
      </div>
      <p className="kf-audio-bar__note" role="status" aria-live="polite">
        {error
          ? error
          : state === 'loading'
            ? 'Loading recorded CC0 sample bank…'
            : muted
              ? 'Sound muted · CC0 representative recordings.'
              : profile === 'silent-50'
                ? 'Sound ready · Representative CC0 preview (provisional dampened profile; shared release).'
                : 'Sound ready · Representative CC0 recordings (shared release).'}
      </p>
    </div>
  );
};
