// Helper che gestisce il ciclo di vita completo del player trailer della scheda.

import videojs from 'video.js';
import { ElementRef } from '@angular/core';
import { AudioGlobaleService } from 'src/app/_servizi_globali/audio-globale.service';
import { SchedaStateContext } from '../scheda_utility/scheda-state.context';
import { SchedaAudioHelper } from './scheda-audio.helper';
import { costruisciUrlTrailer } from '../scheda_utility/scheda-url.utils';

export class SchedaTrailerHelper {
  constructor(
    private ctx: SchedaStateContext,
    private audio: SchedaAudioHelper,
    private audioGlobaleService: AudioGlobaleService,
    private getLang: () => string,
    private onTrailerEnded: () => void,
  ) {}

  /**
   * Pianifica l'inserimento del player della scheda nel DOM.
   *
   * @returns void
   */
  programmaInserimento(): void {
    if (this.ctx.mostraPlayerSchedaNelDom) return; // esco se il player e' gia' previsto nel DOM
    if (this.ctx.timerInserisciPlayerSchedaNelDom) return; // esco se ho gia' pianificato l'inserimento
    this.ctx.timerInserisciPlayerSchedaNelDom = setTimeout(() => {
      this.ctx.timerInserisciPlayerSchedaNelDom = null; // pulisco il timer di inserimento
      this.ctx.mostraPlayerSchedaNelDom = true; // rendo visibile il player nel DOM
      this.richiediAvvio(); // richiedo l'avvio del trailer dopo l'inserimento
    }, 500);
  }

  /**
   * Inizializza il player della scheda partendo dal riferimento DOM.
   *
   * @param ref Riferimento Angular all'elemento video della scheda.
   * @returns void
   */
  inizializzaDaRef(ref: ElementRef): void {
    if (this.ctx.playerScheda) return; // esco se il player esiste gia'
    setTimeout(() => {
      const el = ref?.nativeElement; // recupero l'elemento reale dal riferimento Angular
      if (!el || this.ctx.playerScheda) return; // esco se l'elemento manca oppure il player e' gia' stato creato
      el.setAttribute('crossorigin', 'anonymous'); // imposto crossorigin sul video reale
      this.ctx.playerScheda = videojs(el, {
        controls: false, autoplay: false, muted: false,
        preload: 'auto', loop: false, playsinline: true,
      }); // inizializzo il player video.js con la configurazione prevista
      this.ctx.playerScheda.ready(() => {
        this.ctx.playerSchedaPronto = true; // segno che il player e' pronto
        try { this.audio.inizializzaWebAudio(); } catch {} // provo a inizializzare il grafo WebAudio
        this.programmaAvvioSePossibile(); // provo a pianificare l'avvio se le condizioni lo permettono
        this.ctx.playerScheda.on('ended', () => {
          this.ctx.trailerInRiproduzione = false; // segno che il trailer non e' piu' in riproduzione
          this.ctx.mostraVideoScheda = false; // nascondo il video della scheda
          this.onTrailerEnded(); // notifico il componente che il trailer e' terminato
          this.programmaResetDopoScomparsa(); // pianifico il reset del player dopo la scomparsa
        });
      });
    }, 50);
  }

  /**
   * Richiede l'avvio del trailer della scheda.
   *
   * @param immediato Indica se l'avvio deve partire senza ritardo.
   * @returns void
   */
  richiediAvvio(immediato = false): void {
    this.ctx.avvioTrailerSchedaRichiesto = true; // segno che e' stato richiesto l'avvio del trailer
    this.programmaAvvioSePossibile(immediato); // provo a pianificare l'avvio
  }

  /**
   * Pianifica l'avvio del trailer se tutte le condizioni risultano soddisfatte.
   *
   * @param immediato Indica se usare ritardo zero.
   * @returns void
   */
  programmaAvvioSePossibile(immediato = false): void {
    if (!this.ctx.avvioTrailerSchedaRichiesto) return; // esco se nessuno ha richiesto l'avvio
    if (!this.ctx.playerSchedaPronto) return; // esco se il player non e' ancora pronto
    if (!this.ctx.playerScheda) return; // esco se il player non esiste
    if (this.ctx.timerMostraVideoScheda) return; // esco se ho gia' un avvio pianificato
    if (this.ctx.mostraVideoScheda) return; // esco se il video e' gia' visibile
    if (this.ctx.timerResetPlayerScheda) {
      clearTimeout(this.ctx.timerResetPlayerScheda); // annullo un eventuale reset gia' pianificato
      this.ctx.timerResetPlayerScheda = null; // pulisco il timer di reset
    }
    this.ctx.avvioTrailerSchedaRichiesto = false; // consumo la richiesta di avvio
    const ritardo = immediato ? 0 : 1000; // scelgo il ritardo prima di mostrare il video
    this.ctx.timerMostraVideoScheda = setTimeout(() => {
      this.ctx.timerMostraVideoScheda = null; // pulisco il timer di mostra video
      this.ctx.mostraVideoScheda = true; // rendo visibile il video della scheda
      this.sincronizzaAvvio(); // sincronizzo il caricamento e l'avvio del trailer
    }, ritardo);
  }

  /**
   * Sincronizza il caricamento del trailer sul player corrente.
   *
   * @returns void
   */
  sincronizzaAvvio(): void {
    const url = costruisciUrlTrailer(this.ctx.slugCorrente, this.getLang()); // costruisco l'URL del trailer corrente
    if (!this.ctx.playerScheda) return; // esco se il player non esiste
    if (!this.ctx.mostraVideoScheda) return; // esco se il video non deve essere mostrato
    if (!url) return; // esco se non ho un URL trailer valido
    this.ctx.mostraVideoScheda = false; // nascondo temporaneamente il video finche' non e' pronto
    try { this.ctx.playerScheda.src({ src: url, type: 'video/mp4' }); } catch {} // imposto la sorgente trailer sul player
    this.ctx.playerScheda.one('canplay', () => {
      if (!this.ctx.trailerInRiproduzione) return; // esco se nel frattempo il trailer non deve piu' riprodursi
      this.ctx.mostraVideoScheda = true; // rendo di nuovo visibile il video
      this.proseguiAvvio(); // proseguo con l'avvio vero e proprio
    });
  }

  /**
   * Completa l'avvio del trailer gestendo audio attivo o fallback mutato.
   *
   * @returns void
   */
  proseguiAvvio(): void {
    if (!this.ctx.playerScheda) return; // esco se il player non esiste
    if (this.ctx.audioBloccatoDaUtente) {
      try { this.ctx.playerScheda.muted(true); } catch {} // metto il player in muto se l'utente ha bloccato l'audio
      try { this.ctx.playerScheda.currentTime(0); } catch {} // riporto il trailer all'inizio
      try { this.ctx.playerScheda.play(); } catch {} // provo a far partire il trailer in muto
      return;
    }
    try { this.audio.sfumaGuadagnoVerso(1, 0); } catch {} // porto subito il gain a 1
    try { this.ctx.playerScheda.muted(false); } catch {} // tolgo il mute reale dal player
    try { this.ctx.playerScheda.currentTime(0); } catch {} // riporto il trailer all'inizio
    try {
      const p = this.ctx.playerScheda.play(); // provo a far partire il trailer con audio
      if (p && typeof p.then === 'function') {
        p.then(() => {
          this.ctx.soloBrowserBlocca = false; // tolgo il flag di blocco solo browser dopo l'avvio riuscito
          try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {} // notifico al servizio globale che il fallback browser e' terminato
          this.audio.rimuoviSbloccoAudioScheda(); // rimuovo l'eventuale listener di sblocco audio
        }).catch(() => this.audio.attivaFallbackSoloBrowserBlocca()); // se l'autoplay con audio fallisce attivo il fallback browser
      }
    } catch {
      this.audio.attivaFallbackSoloBrowserBlocca(); // in errore attivo il fallback browser
    }
  }

  /**
   * Resetta il player della scheda per un nuovo avvio pulito.
   *
   * @returns void
   */
  resettaPerNuovoAvvio(): void {
    try { this.ctx.playerScheda?.pause?.(); } catch {} // metto in pausa il player
    try { this.ctx.playerScheda?.currentTime?.(0); } catch {} // riporto il trailer all'inizio
    try { this.ctx.playerScheda?.muted?.(false); } catch {} // tolgo il mute reale dal player
    try { this.audio.ottieniVideoReale()?.load?.(); } catch {} // forzo il reload del video reale
  }

  /**
   * Pianifica il reset del player dopo la scomparsa del trailer.
   *
   * @param extraMs Ritardo aggiuntivo oltre alla durata del fade.
   * @returns void
   */
  programmaResetDopoScomparsa(extraMs = 50): void {
    if (this.ctx.timerResetPlayerScheda) {
      clearTimeout(this.ctx.timerResetPlayerScheda); // annullo un eventuale reset gia' pianificato
      this.ctx.timerResetPlayerScheda = null; // pulisco il timer di reset
    }
    this.ctx.timerResetPlayerScheda = setTimeout(() => {
      this.ctx.timerResetPlayerScheda = null; // pulisco il timer di reset una volta eseguito
      this.resettaPerNuovoAvvio(); // eseguo il reset del player
    }, Math.max(0, this.ctx.durataFadeSchedaMs + extraMs));
  }

  /**
   * Arresta subito il trailer della scheda e ripulisce lo stato.
   *
   * @returns void
   */
  arrestaSubito(): void {
    if (this.ctx.timerMostraVideoScheda) {
      clearTimeout(this.ctx.timerMostraVideoScheda); // annullo il timer che deve mostrare il video
      this.ctx.timerMostraVideoScheda = null; // pulisco il timer mostra video
    }
    if (this.ctx.timerResetPlayerScheda) {
      clearTimeout(this.ctx.timerResetPlayerScheda); // annullo il timer di reset player
      this.ctx.timerResetPlayerScheda = null; // pulisco il timer di reset player
    }
    this.ctx.avvioTrailerSchedaRichiesto = false; // annullo la richiesta di avvio trailer
    this.ctx.mostraVideoScheda = false; // nascondo il video della scheda
    this.ctx.soloBrowserBlocca = false; // tolgo il flag di blocco solo browser
    try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {} // notifico che il fallback browser e' terminato
    this.audio.rimuoviSbloccoAudioScheda(); // rimuovo l'eventuale listener di sblocco audio
    this.resettaPerNuovoAvvio(); // resetto il player per futuri avvii
  }

  /**
   * Chiude il player della scheda con fade audio e reset finale.
   *
   * @param durataMs Durata del fade di chiusura.
   * @returns Promise<void> Promise risolta quando la chiusura e' completata.
   */
  chiudiConFadeEReset(durataMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      [
        this.ctx.timerInserisciPlayerSchedaNelDom,
        this.ctx.timerMostraVideoScheda,
        this.ctx.timerResetPlayerScheda,
      ].forEach((t) => { if (t) clearTimeout(t); }); // annullo tutti i timer collegati al player scheda
      this.ctx.timerInserisciPlayerSchedaNelDom = null; // pulisco il timer di inserimento nel DOM
      this.ctx.timerMostraVideoScheda = null; // pulisco il timer di mostra video
      this.ctx.timerResetPlayerScheda = null; // pulisco il timer di reset player

      this.ctx.avvioTrailerSchedaRichiesto = false; // annullo l'eventuale richiesta di avvio trailer
      this.audio.rimuoviSbloccoAudioScheda(); // rimuovo il listener di sblocco audio
      this.ctx.soloBrowserBlocca = false; // tolgo il flag di blocco solo browser
      try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {} // notifico che il fallback browser e' terminato

      const attesaVisiva = Math.max(0, durataMs || this.ctx.durataFadeSchedaMs || 0); // calcolo la durata visiva da rispettare
      const eraVisibile = this.ctx.mostraVideoScheda; // mi salvo se il video era visibile prima della chiusura
      this.ctx.durataFadeSchedaMs = attesaVisiva; // aggiorno la durata fade nel contesto
      this.ctx.mostraVideoScheda = false; // nascondo il video della scheda

      if (!this.ctx.playerScheda) {
        this.smontaSubito(); // se il player non esiste smonto subito tutto
        resolve(); // risolvo immediatamente
        return;
      }
      if (!eraVisibile) {
        this.resettaPerNuovoAvvio(); // se il video non era visibile faccio solo reset
        this.smontaSubito(); // smonto subito il player
        resolve(); // risolvo immediatamente
        return;
      }

      if (this.ctx.audioBloccatoDaUtente) {
        setTimeout(() => {
          this.resettaPerNuovoAvvio(); // resetto il player dopo l'attesa visiva
          this.smontaSubito(); // smonto il player dal DOM
          resolve(); // risolvo la chiusura
        }, attesaVisiva);
        return;
      }

      try { this.ctx.playerScheda?.muted?.(false); } catch {} // tolgo il mute reale prima del fade audio
      this.audio.sfumaGuadagnoVerso(0, attesaVisiva).finally(() => {
        this.resettaPerNuovoAvvio(); // resetto il player dopo il fade audio
        this.smontaSubito(); // smonto il player dal DOM
        resolve(); // risolvo la chiusura quando tutto e' finito
      });
    });
  }

  /**
   * Smonta subito il player della scheda dal DOM e ne pulisce lo stato.
   *
   * @returns void
   */
  smontaSubito(): void {
    [
      this.ctx.timerInserisciPlayerSchedaNelDom,
      this.ctx.timerMostraVideoScheda,
      this.ctx.timerResetPlayerScheda,
    ].forEach((t) => { if (t) clearTimeout(t); }); // annullo tutti i timer ancora presenti
    this.ctx.timerInserisciPlayerSchedaNelDom = null; // pulisco il timer di inserimento nel DOM
    this.ctx.timerMostraVideoScheda = null; // pulisco il timer di mostra video
    this.ctx.timerResetPlayerScheda = null; // pulisco il timer di reset player

    this.ctx.mostraVideoScheda = false; // nascondo il video della scheda
    this.ctx.mostraPlayerSchedaNelDom = false; // rimuovo il player dal DOM
    this.ctx.playerSchedaPronto = false; // segno che il player non e' piu' pronto

    this.audio.disconnettiNodi(); // scollego i nodi WebAudio

    const p = this.ctx.playerScheda; // mi salvo il riferimento al player corrente
    this.ctx.playerScheda = null; // pulisco il riferimento al player nel contesto
    try { p?.dispose?.(); } catch {} // provo a distruggere il player video.js
  }

  /**
   * Cancella tutti i timer interni collegati al player scheda.
   *
   * @returns void
   */
  clearAllTimers(): void {
    if (this.ctx.timerInserisciPlayerSchedaNelDom) clearTimeout(this.ctx.timerInserisciPlayerSchedaNelDom); // cancello il timer di inserimento nel DOM
    if (this.ctx.timerMostraVideoScheda) clearTimeout(this.ctx.timerMostraVideoScheda); // cancello il timer di mostra video
    if (this.ctx.timerResetPlayerScheda) clearTimeout(this.ctx.timerResetPlayerScheda); // cancello il timer di reset player
    this.ctx.timerInserisciPlayerSchedaNelDom = null; // pulisco il timer di inserimento nel DOM
    this.ctx.timerMostraVideoScheda = null; // pulisco il timer di mostra video
    this.ctx.timerResetPlayerScheda = null; // pulisco il timer di reset player
  }
}
