// ─── player-audio.service.ts ─────────────────────────────────────────────────
// Gestisce AudioContext, GainNode e tutto ciò che riguarda il volume/fade.
// Estratto da player-video.component.ts: setupAudioGraph, setGain, fadeGainTo,
// armFadeInOnce.

import { Injectable } from '@angular/core';
import { sleep } from '../player_utility/player-buffer.utils';

@Injectable()
export class PlayerAudioService {
  audioCtx:        AudioContext                | null = null;
  gainNode:        GainNode                    | null = null;
  mediaSourceNode: MediaElementAudioSourceNode | null = null;

  readonly FADE_PAUSA_MS   = 280;
  readonly FADE_PLAY_MS    = 320;
  readonly WARMUP_DELAY_MS = 90;

  // ── Estratto da setupAudioGraph() ──────────────────────────────────────────
  setupAudioGraph(player: any): void {
    try {
      const tech: any = player?.tech?.(true);
      const videoEl: HTMLVideoElement | undefined = tech?.el?.();
      if (!videoEl) return;
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx)                        this.audioCtx        = new AC();
      if (!this.gainNode && this.audioCtx)       this.gainNode        = this.audioCtx.createGain();
      if (!this.mediaSourceNode && this.audioCtx && this.gainNode) {
        this.mediaSourceNode = this.audioCtx.createMediaElementSource(videoEl);
        this.mediaSourceNode.connect(this.gainNode).connect(this.audioCtx.destination);
      }
      this.setGain(0);
    } catch {}
  }

  // ── Estratto da setGain() ──────────────────────────────────────────────────
  setGain(v: number): void {
    try { if (this.gainNode) this.gainNode.gain.value = v; } catch {}
  }

  // ── Estratto da fadeGainTo() ───────────────────────────────────────────────
  async fadeGainTo(dest: number, ms: number): Promise<void> {
    try {
      if (!this.audioCtx || !this.gainNode) return;
      const now = this.audioCtx.currentTime;
      const g   = this.gainNode.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(dest, now + ms / 1000);
      await sleep(ms);
      g.setValueAtTime(dest, this.audioCtx.currentTime);
    } catch {}
  }

  // ── Estratto da armFadeInOnce() ────────────────────────────────────────────
  armFadeInOnce(player: any, isPaused: () => boolean): void {
    try {
      let fired = false;
      const fire = () => {
        if (fired) return;
        fired = true;
        try { player.muted?.(false); } catch {}
        try {
          const tech: any = player.tech?.(true);
          const ve: HTMLVideoElement | undefined = tech?.el?.();
          if (ve) { ve.muted = false; if (ve.volume === 0) ve.volume = 1; }
        } catch {}
        Promise.resolve(this.audioCtx?.resume?.()).catch(() => {});
        const doFade = () => {
          if (!isPaused()) this.fadeGainTo(1, this.FADE_PLAY_MS);
          else             this.setGain(1);
        };
        const t = Number(player.currentTime?.() ?? 0);
        if (t < 0.12) setTimeout(doFade, this.WARMUP_DELAY_MS);
        else          doFade();
      };
      if (!isPaused()) setTimeout(fire, 0);
      player.one?.('playing',    fire);
      player.one?.('canplay',    fire);
      player.one?.('timeupdate', fire);
      setTimeout(() => { if (!fired && !isPaused()) fire(); }, 700);
    } catch {}
  }

  destroy(): void {
    try { this.audioCtx?.close(); } catch {}
  }
}
