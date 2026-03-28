// ─── player-startup.helper.ts ────────────────────────────────────────────────
// Sequenza di avvio del player: maschera, doppio avvio, fallback mutato,
// gestione audio tracks, switchAudio, buffer helpers.
// Estratto da player-video.component.ts.

import { TranslateService }    from '@ngx-translate/core';
import { SchedaProntaService } from '../../scheda/scheda_service/scheda-pronta.service';
import { PlayerAudioService }  from '../player_service/player-audio.service';
import { PlayerStateContext }  from '../player_utility/player-state.context';
import {
  sleep,
  calcolaBufferedEndCompat,
  waitForFullscreen,
} from '../player_utility/player-buffer.utils';

export class PlayerStartupHelper {

  private startupMaskEl: HTMLDivElement | null = null;

  readonly START_BUFFER_S = 5;
  readonly WARMUP_MUTO_MS = 1000;

  constructor(
    private ctx:         PlayerStateContext,
    private audio:       PlayerAudioService,
    private schedaPronta: SchedaProntaService,
    private translate:   TranslateService,
  ) {}

  // ── Maschera di avvio ─────────────────────────────────────────────────────
  // Estratto da creaMascheraAvvio()
  creaMascheraAvvio(): void {
    try {
      const root = this.ctx.player?.el?.() as HTMLElement | null;
      if (!root) return;
      if (!this.startupMaskEl) {
        this.startupMaskEl           = document.createElement('div');
        this.startupMaskEl.className = 'vjs-startup-mask vjs-startup-mask--hide';
        root.appendChild(this.startupMaskEl);
      }
    } catch {}
  }

  // Estratto da mostraMascheraAvvio()
  mostraMascheraAvvio(): void {
    this.creaMascheraAvvio();
    try {
      const root = this.ctx.player?.el?.() as HTMLElement | null;
      if (root && this.startupMaskEl) { try { root.appendChild(this.startupMaskEl); } catch {} }
      this.startupMaskEl?.classList.remove('vjs-startup-mask--hide');
      void (this.startupMaskEl?.offsetWidth);
      this.audio.setGain(0);
      try { this.ctx.player?.muted?.(true); } catch {}
    } catch {}
    setTimeout(() => {
      try { this.startupMaskEl?.classList.remove('vjs-startup-mask--hide'); } catch {}
    }, 0);
  }

  // Estratto da nascondiMascheraAvvio()
  nascondiMascheraAvvio(): void {
    if (!this.startupMaskEl) return;
    this.startupMaskEl.classList.add('vjs-startup-mask--hide');
    this.schedaPronta.impostaHeaderNascosto(false);
  }

  destroyMask(): void {
    try { this.startupMaskEl?.remove(); } catch {}
  }

  // ── Sequenza doppio avvio ─────────────────────────────────────────────────
  // Estratto da doppioAvvioSeRichiesto()
  async doppioAvvioSeRichiesto(): Promise<void> {
    this.ctx.doppioAvvioEseguito = true;
    try {
      const p = this.ctx.player;
      if (!p) return;

      const root         = p.el?.() as HTMLElement | null;
      const fullscreenOk = await waitForFullscreen(root, 2500);
      if (!fullscreenOk) { await this.avviaFallbackMutato(); return; }

      this.mostraMascheraAvvio();
      const fallbackTimer = setTimeout(() => this.nascondiMascheraAvvio(), 30000);
      this.audio.setGain(0);
      try { p.muted?.(true); } catch {}

      const tracks = await this.waitForAudioTracks(2000);
      if (!tracks || tracks.length === 0) return;

      const corretta = this.deduciLinguaCorretta();
      const opposta: 'en'|'it' = corretta === 'it' ? 'en' : 'it';

      try { p.currentTime?.(0); } catch {}
      await this.impostaLinguaAudio(opposta, false, false);
      await sleep(120);

      await new Promise<void>((resolve) => {
        let ok = false;
        const onTime = () => { if (Number(p.currentTime?.() ?? 0) >= 0.08) { ok = true; off(); } };
        const off    = () => { p.off?.('timeupdate', onTime); resolve(); };
        p.on?.('timeupdate', onTime);
        Promise.resolve(p.play?.()).catch(() => {}).finally(async () => {
          await sleep(600); if (!ok) off();
        });
      });

      this.ctx.playInterno = true;
      try { this.ctx.originalPause?.(); } catch { try { p.pause?.(); } catch {} }
      this.ctx.playInterno = false;
      await sleep(150);
      try { p.currentTime?.(0); } catch {}

      await this.impostaLinguaAudio(corretta, false, false);
      await this.waitBufferFromZero(this.START_BUFFER_S, 12000);

      // ── Fase 1: play mutato ───────────────────────────────────────────────
      try { p.currentTime?.(0); } catch {}
      this.audio.setGain(0);
      try { p.muted?.(true); } catch {}
      try {
        const ve = p.tech?.(true)?.el?.() as HTMLVideoElement | undefined;
        if (ve) ve.muted = true;
      } catch {}
      this.ctx.playInterno = true;
      try { await Promise.resolve(this.ctx.originalPlay?.()); } catch {}
      this.ctx.playInterno = false;
      await sleep(this.WARMUP_MUTO_MS);

      // ── Fase 2: pausa, torna a 0 ─────────────────────────────────────────
      this.ctx.playInterno = true;
      try { this.ctx.originalPause?.(); } catch {}
      this.ctx.playInterno = false;
      await sleep(60);
      try { p.currentTime?.(0); } catch {}

      // ── Fase 3: play reale con audio, smascheramento ─────────────────────
      try { p.muted?.(false); } catch {}
      try {
        const ve = p.tech?.(true)?.el?.() as HTMLVideoElement | undefined;
        if (ve) { ve.muted = false; if (ve.volume === 0) ve.volume = 1; }
      } catch {}
      this.audio.setGain(0);
      this.ctx.avvioConsentito = false;
      this.agganciaNascondiSuPrimoFrame(p, fallbackTimer);

      this.ctx.playInterno = true;
      try { await Promise.resolve(this.ctx.originalPlay?.()); } catch {}
      this.ctx.playInterno = false;

      await this.waitMinHeadroom(2.0, 5000);
      this.ctx.avvioConsentito     = true;
      await this.audio.fadeGainTo(1, this.audio.FADE_PLAY_MS);
      try { this.audio.setGain(1); } catch {}
      this.ctx.doppioAvvioEseguito = true;
      this.mostraMessaggioDisclaimer();
    } catch { await this.avviaFallbackMutato(); }
  }

  // ── Fallback mutato ───────────────────────────────────────────────────────
  // Estratto da avviaFallbackMutato()
  async avviaFallbackMutato(): Promise<void> {
    try {
      const p = this.ctx.player;
      if (!p) return;
      this.ctx.avvioConsentito = false;
      this.audio.setGain(0);
      try { p.muted?.(true); } catch {}
      try {
        const ve = p.tech?.(true)?.el?.() as HTMLVideoElement | undefined;
        if (ve) ve.muted = true;
      } catch {}
      this.ctx.playInterno = true;
      try { await Promise.resolve(this.ctx.originalPlay?.()); } catch {}
      this.ctx.playInterno = false;
      const fallbackTimer = setTimeout(() => this.nascondiMascheraAvvio(), 30000);
      this.agganciaNascondiSuPrimoFrame(p, fallbackTimer);
      this.ctx.avvioConsentito = true;
      this.mostraMessaggioDisclaimer();
    } catch {}
  }

  // ── Estratto da agganciaNascondiSuPrimoFrame() ────────────────────────────
  agganciaNascondiSuPrimoFrame(p: any, fallbackTimer: any): void {
    const tech:  any = p?.tech?.(true);
    const video: HTMLVideoElement | undefined = tech?.el?.();
    let done = false;
    const cleanup = () => {
      if (done) return; done = true;
      p.off?.('loadeddata', onLoadedPaint);
      p.off?.('playing',    onLoadedPaint);
      p.off?.('timeupdate', onLoadedPaint);
    };
    const hideNow = () => {
      cleanup();
      this.waitMinHeadroom(2.0, 5000).finally(() => {
        this.nascondiMascheraAvvio();
        clearTimeout(fallbackTimer);
      });
    };
    const onLoadedPaint = () => requestAnimationFrame(() => requestAnimationFrame(hideNow));
    try {
      if (video && (video as any).requestVideoFrameCallback) {
        (video as any).requestVideoFrameCallback(() => hideNow());
      } else {
        p.on?.('loadeddata', onLoadedPaint);
        p.on?.('playing',    onLoadedPaint);
        p.on?.('timeupdate', onLoadedPaint);
      }
      if (video && video.readyState >= 2) onLoadedPaint();
    } catch { p.on?.('loadeddata', onLoadedPaint); }
  }

  // ── Estratto da mostraMessaggioDisclaimer() ───────────────────────────────
  mostraMessaggioDisclaimer(ritardoMs = 4000): void {
    setTimeout(() => {
      try {
        const playerEl = this.ctx.player?.el?.() as HTMLElement | null;
        if (!playerEl) return;
        const msg         = document.createElement('div');
        msg.className     = 'vjs-startup-message';
        msg.textContent   = this.translate.instant('ui.videojs.disclaimer');
        playerEl.appendChild(msg);
        setTimeout(() => msg.remove(), 9500);
      } catch {}
    }, ritardoMs);
  }

  // ── Cambio lingua audio ───────────────────────────────────────────────────
  // Estratto da impostaLinguaAudio() e switchAudio()
  async impostaLinguaAudio(lang: 'en'|'it', _persist = true, smooth = false): Promise<void> {
    try {
      const tr = this.ctx.player?.audioTracks?.();
      if (!tr) return;
      const target = lang === 'it' ? ['italiano', 'italian'] : ['inglese', 'english'];
      for (let i = 0; i < tr.length; i++) tr[i].enabled = false;
      for (let i = 0; i < tr.length; i++) {
        const lbl = (tr[i].label || '').toLowerCase();
        if (target.some(t => lbl.includes(t))) tr[i].enabled = true;
      }
      if (smooth) {
        const t = Number(this.ctx.player?.currentTime?.() ?? 0);
        try { this.ctx.player?.currentTime?.(Math.max(0, t + 0.5)); await sleep(30); this.ctx.player?.currentTime?.(t); } catch {}
      }
    } catch {}
  }

  async switchAudio(lang: 'en'|'it'): Promise<void> {
    const p = this.ctx.player;
    const stavaSuonando = !p?.paused?.();
    await Promise.resolve(this.audio.audioCtx?.resume?.()).catch(() => {});
    await this.audio.fadeGainTo(0, this.audio.FADE_PAUSA_MS);
    this.ctx.playInterno = true;
    try { this.ctx.originalPause?.(); } catch { try { p?.pause?.(); } catch {} }
    await this.impostaLinguaAudio(lang, true, true);
    const t = Number(p?.currentTime?.() ?? 0);
    try { p?.currentTime?.(t + 0.01); } catch {}
    const onReady = async () => {
      p?.off?.('canplay', onReady);
      if (stavaSuonando) {
        try { await Promise.resolve(this.ctx.originalPlay?.()); } catch {}
        this.ctx.playInterno = false;
        await this.audio.fadeGainTo(1, this.audio.FADE_PLAY_MS);
      } else { this.ctx.playInterno = false; }
    };
    p?.on?.('canplay', onReady);
    setTimeout(async () => {
      try { p?.off?.('canplay', onReady); } catch {}
      if (stavaSuonando) {
        try { await Promise.resolve(this.ctx.originalPlay?.()); } catch {}
        this.ctx.playInterno = false;
        await this.audio.fadeGainTo(1, this.audio.FADE_PLAY_MS);
      } else { this.ctx.playInterno = false; }
    }, 600);
  }

  // ── Estratto da deduciLinguaCorretta() ───────────────────────────────────
  deduciLinguaCorretta(): 'en'|'it' {
    const saved = localStorage.getItem('video_lingua');
    if (saved === 'italiano') return 'it';
    if (saved === 'inglese')  return 'en';
    try {
      const tr: any = this.ctx.player?.audioTracks?.();
      if (tr) {
        for (let i = 0; i < tr.length; i++) {
          const lbl = (tr[i].label || '').toLowerCase();
          if (tr[i].enabled && (lbl.includes('italiano') || lbl.includes('italian'))) return 'it';
          if (tr[i].enabled && (lbl.includes('inglese')  || lbl.includes('english'))) return 'en';
        }
      }
    } catch {}
    return this.ctx.currentLang;
  }

  // ── Buffer / timing helpers ───────────────────────────────────────────────
  // Estratto da waitForAudioTracks()
  async waitForAudioTracks(timeoutMs: number): Promise<any[] | null> {
    const p = this.ctx.player; const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const tr = p?.audioTracks?.();
        if (tr && tr.length > 0) return Array.from({ length: tr.length }, (_, i) => tr[i]);
      } catch {}
      await sleep(50);
    }
    try {
      const tr = p?.audioTracks?.();
      if (tr && tr.length > 0) return Array.from({ length: tr.length }, (_, i) => tr[i]);
    } catch {}
    return null;
  }

  // Estratto da waitBufferFromZero()
  async waitBufferFromZero(targetS: number, timeoutMs: number): Promise<boolean> {
    const p = this.ctx.player; const start = Date.now();
    try { p?.currentTime?.(0); } catch {}
    Promise.resolve(p?.play?.()).catch(() => {});
    while (Date.now() - start < timeoutMs) {
      if (calcolaBufferedEndCompat(p) >= targetS - 0.1) {
        this.ctx.playInterno = true; try { this.ctx.originalPause?.(); } catch {}
        this.ctx.playInterno = false; return true;
      }
      await sleep(50);
    }
    this.ctx.playInterno = true; try { this.ctx.originalPause?.(); } catch {}
    this.ctx.playInterno = false; return false;
  }

  // Estratto da waitMinHeadroom()
  async waitMinHeadroom(minHeadroomSec = 2.0, timeoutMs = 4000): Promise<boolean> {
    const p = this.ctx.player; const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      let ct = 0;
      try { ct = Number(p?.currentTime?.() ?? 0); } catch {}
      const headroom = calcolaBufferedEndCompat(p) - ct;
      let readyOk = true;
      try {
        const ve = p?.tech?.(true)?.el?.() as HTMLVideoElement | undefined;
        readyOk = !!ve && ve.readyState >= 3;
      } catch {}
      if (readyOk && headroom >= minHeadroomSec) return true;
      await sleep(50);
    }
    return false;
  }
}
