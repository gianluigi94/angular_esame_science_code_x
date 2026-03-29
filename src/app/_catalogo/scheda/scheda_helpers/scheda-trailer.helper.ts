// ─── scheda-trailer.helper.ts ────────────────────────────────────────────────
// Ciclo di vita completo del player trailer della scheda.
// Estratto da scheda.component.ts.

import videojs           from 'video.js';
import { ElementRef }    from '@angular/core';
import { AudioGlobaleService }      from 'src/app/_servizi_globali/audio-globale.service';
import { SchedaStateContext }       from '../scheda_utility/scheda-state.context';
import { SchedaAudioHelper }        from './scheda-audio.helper';
import { costruisciUrlTrailer }     from '../scheda_utility/scheda-url.utils';

export class SchedaTrailerHelper {

  constructor(
    private ctx:                 SchedaStateContext,
    private audio:               SchedaAudioHelper,
    private audioGlobaleService: AudioGlobaleService,
    private getLang:             () => string,
    private onTrailerEnded:      () => void,   // callback → aggiorna label nel componente
  ) {}

  // ── Estratto da programmaInserimentoPlayerSchedaNelDom() ──────────────────
  programmaInserimento(): void {
    if (this.ctx.mostraPlayerSchedaNelDom) return;
    if (this.ctx.timerInserisciPlayerSchedaNelDom) return;
    this.ctx.timerInserisciPlayerSchedaNelDom = setTimeout(() => {
      this.ctx.timerInserisciPlayerSchedaNelDom = null;
      this.ctx.mostraPlayerSchedaNelDom = true;
      this.richiediAvvio();
    }, 500);
  }

  // ── Estratto da inizializzaPlayerSchedaDaRef() ────────────────────────────
  inizializzaDaRef(ref: ElementRef): void {
    if (this.ctx.playerScheda) return;
    setTimeout(() => {
      const el = ref?.nativeElement;
      if (!el || this.ctx.playerScheda) return;
      el.setAttribute('crossorigin', 'anonymous');
      this.ctx.playerScheda = videojs(el, {
        controls: false, autoplay: false, muted: false,
        preload: 'auto', loop: false, playsinline: true,
      });
      this.ctx.playerScheda.ready(() => {
        this.ctx.playerSchedaPronto = true;
        try { this.audio.inizializzaWebAudio(); } catch {}
        this.programmaAvvioSePossibile();
        this.ctx.playerScheda.on('ended', () => {
          this.ctx.trailerInRiproduzione = false;
          this.ctx.mostraVideoScheda     = false;
          this.onTrailerEnded();
          this.programmaResetDopoScomparsa();
        });
      });
    }, 50);
  }

  // ── Estratto da richiediAvvioTrailerScheda() ──────────────────────────────
  richiediAvvio(immediato = false): void {
    this.ctx.avvioTrailerSchedaRichiesto = true;
    this.programmaAvvioSePossibile(immediato);
  }

  // ── Estratto da programmaAvvioTrailerSchedaSePossibile() ──────────────────
  programmaAvvioSePossibile(immediato = false): void {
    if (!this.ctx.avvioTrailerSchedaRichiesto) return;
    if (!this.ctx.playerSchedaPronto)          return;
    if (!this.ctx.playerScheda)                return;
    if (this.ctx.timerMostraVideoScheda)       return;
    if (this.ctx.mostraVideoScheda)            return;
    if (this.ctx.timerResetPlayerScheda) {
      clearTimeout(this.ctx.timerResetPlayerScheda);
      this.ctx.timerResetPlayerScheda = null;
    }
    this.ctx.avvioTrailerSchedaRichiesto = false;
    const ritardo = immediato ? 0 : 1000;
    this.ctx.timerMostraVideoScheda = setTimeout(() => {
      this.ctx.timerMostraVideoScheda = null;
      this.ctx.mostraVideoScheda = true;
      this.sincronizzaAvvio();
    }, ritardo);
  }

  // ── Estratto da sincronizzaAvvioTrailerScheda() ───────────────────────────
  sincronizzaAvvio(): void {
    const url = costruisciUrlTrailer(this.ctx.slugCorrente, this.getLang());
    if (!this.ctx.playerScheda) return;
    if (!this.ctx.mostraVideoScheda) return;
    if (!url) return;
    this.ctx.mostraVideoScheda = false;
    try { this.ctx.playerScheda.src({ src: url, type: 'video/mp4' }); } catch {}
    this.ctx.playerScheda.one('canplay', () => {
      if (!this.ctx.trailerInRiproduzione) return;
      this.ctx.mostraVideoScheda = true;
      this.proseguiAvvio();
    });
  }

  // ── Estratto da proseguiAvvioTrailerScheda() ──────────────────────────────
  proseguiAvvio(): void {
    if (!this.ctx.playerScheda) return;
    if (this.ctx.audioBloccatoDaUtente) {
      try { this.ctx.playerScheda.muted(true); } catch {}
      try { this.ctx.playerScheda.currentTime(0); } catch {}
      try { this.ctx.playerScheda.play(); } catch {}
      return;
    }
    try { this.audio.sfumaGuadagnoVerso(1, 0); } catch {}
    try { this.ctx.playerScheda.muted(false); } catch {}
    try { this.ctx.playerScheda.currentTime(0); } catch {}
    try {
      const p = this.ctx.playerScheda.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          this.ctx.soloBrowserBlocca = false;
          try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {}
          this.audio.rimuoviSbloccoAudioScheda();
        }).catch(() => this.audio.attivaFallbackSoloBrowserBlocca());
      }
    } catch { this.audio.attivaFallbackSoloBrowserBlocca(); }
  }

  // ── Estratto da resettaPlayerSchedaPerNuovoAvvio() ────────────────────────
  resettaPerNuovoAvvio(): void {
    try { this.ctx.playerScheda?.pause?.(); } catch {}
    try { this.ctx.playerScheda?.currentTime?.(0); } catch {}
    try { this.ctx.playerScheda?.muted?.(false); } catch {}
    try { this.audio.ottieniVideoReale()?.load?.(); } catch {}
  }

  // ── Estratto da programmaResetPlayerSchedaDopoScomparsa() ─────────────────
  programmaResetDopoScomparsa(extraMs = 50): void {
    if (this.ctx.timerResetPlayerScheda) {
      clearTimeout(this.ctx.timerResetPlayerScheda);
      this.ctx.timerResetPlayerScheda = null;
    }
    this.ctx.timerResetPlayerScheda = setTimeout(() => {
      this.ctx.timerResetPlayerScheda = null;
      this.resettaPerNuovoAvvio();
    }, Math.max(0, this.ctx.durataFadeSchedaMs + extraMs));
  }

  // ── Estratto da arrestaTrailerSchedaSubito() ──────────────────────────────
  arrestaSubito(): void {
    if (this.ctx.timerMostraVideoScheda) {
      clearTimeout(this.ctx.timerMostraVideoScheda);
      this.ctx.timerMostraVideoScheda = null;
    }
    if (this.ctx.timerResetPlayerScheda) {
      clearTimeout(this.ctx.timerResetPlayerScheda);
      this.ctx.timerResetPlayerScheda = null;
    }
    this.ctx.avvioTrailerSchedaRichiesto = false;
    this.ctx.mostraVideoScheda           = false;
    this.ctx.soloBrowserBlocca           = false;
    try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {}
    this.audio.rimuoviSbloccoAudioScheda();
    this.resettaPerNuovoAvvio();
  }

  // ── Estratto da chiudiPlayerSchedaConFadeEReset() ─────────────────────────
  chiudiConFadeEReset(durataMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      [
        this.ctx.timerInserisciPlayerSchedaNelDom,
        this.ctx.timerMostraVideoScheda,
        this.ctx.timerResetPlayerScheda,
      ].forEach(t => { if (t) clearTimeout(t); });
      this.ctx.timerInserisciPlayerSchedaNelDom = null;
      this.ctx.timerMostraVideoScheda           = null;
      this.ctx.timerResetPlayerScheda           = null;

      this.ctx.avvioTrailerSchedaRichiesto = false;
      this.audio.rimuoviSbloccoAudioScheda();
      this.ctx.soloBrowserBlocca = false;
      try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {}

      const attesaVisiva = Math.max(0, durataMs || this.ctx.durataFadeSchedaMs || 0);
      const eraVisibile  = this.ctx.mostraVideoScheda;
      this.ctx.durataFadeSchedaMs = attesaVisiva;
      this.ctx.mostraVideoScheda  = false;

      if (!this.ctx.playerScheda) { this.smontaSubito(); resolve(); return; }
      if (!eraVisibile)           { this.resettaPerNuovoAvvio(); this.smontaSubito(); resolve(); return; }

               if (this.ctx.audioBloccatoDaUtente) {
        setTimeout(() => {
          this.resettaPerNuovoAvvio();
          this.smontaSubito();
          resolve();
        }, attesaVisiva);
        return;
      }

      try { this.ctx.playerScheda?.muted?.(false); } catch {}
      this.audio.sfumaGuadagnoVerso(0, attesaVisiva).finally(() => {
        this.resettaPerNuovoAvvio();
        this.smontaSubito();
        resolve();
      });
    });
  }

  // ── Estratto da smontaPlayerSchedaDalDomSubito() ──────────────────────────
  smontaSubito(): void {
    [
      this.ctx.timerInserisciPlayerSchedaNelDom,
      this.ctx.timerMostraVideoScheda,
      this.ctx.timerResetPlayerScheda,
    ].forEach(t => { if (t) clearTimeout(t); });
    this.ctx.timerInserisciPlayerSchedaNelDom = null;
    this.ctx.timerMostraVideoScheda           = null;
    this.ctx.timerResetPlayerScheda           = null;

    this.ctx.mostraVideoScheda        = false;
    this.ctx.mostraPlayerSchedaNelDom = false;
    this.ctx.playerSchedaPronto       = false;

    this.audio.disconnettiNodi();

    const p = this.ctx.playerScheda;
    this.ctx.playerScheda = null;
    try { p?.dispose?.(); } catch {}
  }

  clearAllTimers(): void {
    if (this.ctx.timerInserisciPlayerSchedaNelDom) clearTimeout(this.ctx.timerInserisciPlayerSchedaNelDom);
    if (this.ctx.timerMostraVideoScheda)           clearTimeout(this.ctx.timerMostraVideoScheda);
    if (this.ctx.timerResetPlayerScheda)           clearTimeout(this.ctx.timerResetPlayerScheda);
    this.ctx.timerInserisciPlayerSchedaNelDom = null;
    this.ctx.timerMostraVideoScheda           = null;
    this.ctx.timerResetPlayerScheda           = null;
  }
}
