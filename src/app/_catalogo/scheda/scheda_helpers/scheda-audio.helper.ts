// ─── scheda-audio.helper.ts ──────────────────────────────────────────────────
// Gestisce il grafo WebAudio per il trailer della scheda.
// Estratto da scheda.component.ts: inizializzaWebAudio, sfumaGuadagnoVerso,
// attivaFallbackSoloBrowserBlocca, preparaSbloccoAudioScheda,
// rimuoviSbloccoAudioScheda.

import { AudioGlobaleService } from 'src/app/_servizi_globali/audio-globale.service';
import { SchedaStateContext }  from '../scheda_utility/scheda-state.context';

export class SchedaAudioHelper {

  constructor(
    private ctx:                SchedaStateContext,
    private audioGlobaleService: AudioGlobaleService,
    private onSbloccoRiuscito:  () => void,
    private onSbloccoFallito:   () => void,
  ) {}

  // ── Estratto da ottieniVideoReale() ───────────────────────────────────────
  ottieniVideoReale(): HTMLVideoElement | null {
    try {
      if (!this.ctx.playerScheda?.el) return null;
      return (this.ctx.playerScheda.el() as HTMLElement).querySelector('video');
    } catch { return null; }
  }

  // ── Estratto da inizializzaWebAudio() ─────────────────────────────────────
  inizializzaWebAudio(): void {
    const el = this.ottieniVideoReale();
    if (!el) return;
    if (this.ctx.elementoVideoReale === el && this.ctx.nodoSorgente && this.ctx.nodoGuadagno) return;
    try {
      try { this.ctx.nodoSorgente?.disconnect(); } catch {}
      try { this.ctx.nodoGuadagno?.disconnect(); } catch {}
      if (!this.ctx.contestoAudio) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        this.ctx.contestoAudio = new Ctx();
      }
      el.setAttribute('crossorigin', 'anonymous');
      el.setAttribute('playsinline', '');
      this.ctx.elementoVideoReale  = el;
      this.ctx.nodoSorgente        = this.ctx.contestoAudio.createMediaElementSource(el);
      this.ctx.nodoGuadagno        = this.ctx.contestoAudio.createGain();
      try { this.ctx.nodoGuadagno.gain.setValueAtTime(1, this.ctx.contestoAudio.currentTime); } catch {}
      this.ctx.nodoSorgente.connect(this.ctx.nodoGuadagno).connect(this.ctx.contestoAudio.destination);
    } catch {}
  }

  // ── Estratto da sfumaGuadagnoVerso() ──────────────────────────────────────
  sfumaGuadagnoVerso(target: number, durataMs: number): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (!this.ctx.contestoAudio || !this.ctx.nodoGuadagno) return resolve();
        const durataSec = Math.max(0, (durataMs || 0) / 1000);
        const t0 = this.ctx.contestoAudio.currentTime;
        try { this.ctx.nodoGuadagno.gain.cancelScheduledValues(t0); } catch {}
        try { this.ctx.nodoGuadagno.gain.setValueAtTime(this.ctx.nodoGuadagno.gain.value ?? 0, t0); } catch {}
        try { this.ctx.nodoGuadagno.gain.linearRampToValueAtTime(target, t0 + durataSec); } catch {}
        if (durataSec === 0) return resolve();
        const nativeTimeout = (window as any).__zone_symbol__setTimeout ?? setTimeout;
        nativeTimeout(resolve, Math.max(0, durataMs));
      } catch { resolve(); }
    });
  }

  // ── Estratto da attivaFallbackSoloBrowserBlocca() ─────────────────────────
  attivaFallbackSoloBrowserBlocca(): void {
    if (!this.ctx.playerScheda) return;
    if (this.ctx.audioBloccatoDaUtente) return;
    this.ctx.soloBrowserBlocca = true;
    try { this.audioGlobaleService.setSoloBrowserBlocca(true); } catch {}
    try { this.ctx.playerScheda.muted(true); } catch {}
    try { this.ctx.playerScheda.currentTime(0); } catch {}
    try { this.ctx.playerScheda.play(); } catch {}
    this.preparaSbloccoAudioScheda();
  }

  // ── Estratto da preparaSbloccoAudioScheda() ───────────────────────────────
  preparaSbloccoAudioScheda(): void {
    if (this.ctx.handlerSbloccoAudioScheda) return;
    if (this.ctx.audioBloccatoDaUtente) return;

    this.ctx.handlerSbloccoAudioScheda = () => {
      this.rimuoviSbloccoAudioScheda();
      if (!this.ctx.playerScheda) return;
      if (this.ctx.audioBloccatoDaUtente) return;

      if (!this.ctx.mostraVideoScheda) {
        this.ctx.soloBrowserBlocca = false;
        try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {}
        try {
          if (this.ctx.contestoAudio?.state === 'suspended')
            this.ctx.contestoAudio.resume().catch(() => {});
        } catch {}
        try { this.sfumaGuadagnoVerso(1, 0); } catch {}
        this.onSbloccoRiuscito();
        return;
      }

      this.ctx.mostraVideoScheda = false;
      this.sfumaGuadagnoVerso(0, this.ctx.durataFadeSchedaMs).then(() => {
        try { this.ctx.playerScheda.pause(); } catch {}
        try { this.ctx.playerScheda.currentTime(0); } catch {}
        try { this.ctx.playerScheda.muted(false); } catch {}
        try {
          if (this.ctx.contestoAudio?.state === 'suspended')
            this.ctx.contestoAudio.resume().catch(() => {});
        } catch {}
        setTimeout(() => {
          if (this.ctx.distrutto || !this.ctx.playerScheda) return;
          try { this.sfumaGuadagnoVerso(0, 0); } catch {}
          this.ctx.mostraVideoScheda = true;
          try { this.sfumaGuadagnoVerso(1, this.ctx.durataFadeSchedaMs); } catch {}
          const p = this.ctx.playerScheda.play();
          if (p && typeof p.then === 'function') {
            p.then(() => {
              this.ctx.soloBrowserBlocca = false;
              try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {}
            }).catch(() => {
              this.ctx.mostraVideoScheda = false;
              if (!this.ctx.distrutto) this.attivaFallbackSoloBrowserBlocca();
            });
          }
        }, 500);
      });
    };

    window.addEventListener('click', this.ctx.handlerSbloccoAudioScheda, { once: true, passive: true, capture: true });
  }

  // ── Estratto da rimuoviSbloccoAudioScheda() ───────────────────────────────
  rimuoviSbloccoAudioScheda(): void {
    const h = this.ctx.handlerSbloccoAudioScheda;
    if (!h) return;
    try { window.removeEventListener('click', h, true); } catch {}
    this.ctx.handlerSbloccoAudioScheda = null;
  }

  disconnettiNodi(): void {
    try { this.ctx.nodoSorgente?.disconnect?.(); } catch {}
    try { this.ctx.nodoGuadagno?.disconnect?.(); } catch {}
    this.ctx.nodoSorgente       = null;
    this.ctx.nodoGuadagno       = null;
    this.ctx.elementoVideoReale = null;
  }
}
