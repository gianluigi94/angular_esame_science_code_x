// Helper che gestisce WebAudio e lo sblocco audio del trailer nella scheda.

import { AudioGlobaleService } from 'src/app/_servizi_globali/audio-globale.service';
import { SchedaStateContext } from '../scheda_utility/scheda-state.context';

export class SchedaAudioHelper {
  constructor(
    private ctx: SchedaStateContext,
    private audioGlobaleService: AudioGlobaleService,
    private onSbloccoRiuscito: () => void,
    private onSbloccoFallito: () => void,
  ) {}

  /**
   * Restituisce il vero elemento video interno al player della scheda.
   *
   * @returns HTMLVideoElement | null Elemento video reale se presente, altrimenti null.
   */
  ottieniVideoReale(): HTMLVideoElement | null {
    try {
      if (!this.ctx.playerScheda?.el) return null; // esco se il player non espone l'elemento root
      return (this.ctx.playerScheda.el() as HTMLElement).querySelector('video'); // cerco il tag video reale dentro il player
    } catch {
      return null; // se qualcosa fallisce restituisco null
    }
  }

  /**
   * Inizializza o ricollega il grafo WebAudio al video reale della scheda.
   * - Recupera il video reale dal player
   * - Evita di reinizializzare se il collegamento e' gia' valido
   * - Disconnette eventuali nodi precedenti
   * - Crea AudioContext, MediaElementSource e GainNode
   * - Collega il gain alla destinazione finale
   *
   * @returns void
   */
  inizializzaWebAudio(): void {
    const el = this.ottieniVideoReale(); // recupero il video reale dal player
    if (!el) return; // esco se non trovo un video reale
    if (this.ctx.elementoVideoReale === el && this.ctx.nodoSorgente && this.ctx.nodoGuadagno) return; // esco se il collegamento corrente e' gia' valido
    try {
      try { this.ctx.nodoSorgente?.disconnect(); } catch {} // provo a scollegare la vecchia sorgente
      try { this.ctx.nodoGuadagno?.disconnect(); } catch {} // provo a scollegare il vecchio gain
      if (!this.ctx.contestoAudio) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext; // recupero il costruttore compatibile dell'audio context
        if (!Ctx) return; // esco se WebAudio non e' disponibile
        this.ctx.contestoAudio = new Ctx(); // creo il contesto audio solo se manca
      }
      el.setAttribute('crossorigin', 'anonymous'); // imposto il crossorigin sul video reale
      el.setAttribute('playsinline', ''); // imposto playsinline sul video reale
      this.ctx.elementoVideoReale = el; // salvo il riferimento al video reale corrente
      this.ctx.nodoSorgente = this.ctx.contestoAudio.createMediaElementSource(el); // creo il nodo sorgente dal video reale
      this.ctx.nodoGuadagno = this.ctx.contestoAudio.createGain(); // creo il gain node per il controllo del volume
      try { this.ctx.nodoGuadagno.gain.setValueAtTime(1, this.ctx.contestoAudio.currentTime); } catch {} // imposto il gain iniziale a 1
      this.ctx.nodoSorgente.connect(this.ctx.nodoGuadagno).connect(this.ctx.contestoAudio.destination); // collego sorgente, gain e destinazione finale
    } catch {}
  }

  /**
   * Sfuma il guadagno WebAudio verso un valore target.
   * - Esce subito se il grafo audio non e' pronto
   * - Cancella eventuali schedule precedenti
   * - Imposta il valore di partenza corrente
   * - Esegue una rampa lineare fino al target
   *
   * @param target Valore finale del gain.
   * @param durataMs Durata della sfumatura in millisecondi.
   * @returns Promise<void> Promise risolta al termine della sfumatura.
   */
  sfumaGuadagnoVerso(target: number, durataMs: number): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (!this.ctx.contestoAudio || !this.ctx.nodoGuadagno) return resolve(); // esco subito se il grafo audio non e' disponibile
        const durataSec = Math.max(0, (durataMs || 0) / 1000); // converto la durata in secondi
        const t0 = this.ctx.contestoAudio.currentTime; // leggo il tempo corrente del contesto audio
        try { this.ctx.nodoGuadagno.gain.cancelScheduledValues(t0); } catch {} // annullo eventuali rampe gia' pianificate
        try { this.ctx.nodoGuadagno.gain.setValueAtTime(this.ctx.nodoGuadagno.gain.value ?? 0, t0); } catch {} // fisso il punto di partenza al valore corrente
        try { this.ctx.nodoGuadagno.gain.linearRampToValueAtTime(target, t0 + durataSec); } catch {} // pianifico la rampa verso il target
        if (durataSec === 0) return resolve(); // risolvo subito se la durata e' zero
        const nativeTimeout = (window as any).__zone_symbol__setTimeout ?? setTimeout; // uso il timeout nativo se disponibile
        nativeTimeout(resolve, Math.max(0, durataMs)); // risolvo quando la durata della sfumatura e' trascorsa
      } catch {
        resolve(); // in caso di errore risolvo comunque
      }
    });
  }

  /**
   * Attiva il fallback in solo browser blocca quando l'audio non puo' partire.
   * - Esce se il player non esiste o se l'audio e' bloccato dall'utente
   * - Mette il player in muto
   * - Riporta il video all'inizio
   * - Prova a far partire il trailer in muto
   * - Prepara poi lo sblocco audio su interazione
   *
   * @returns void
   */
  attivaFallbackSoloBrowserBlocca(): void {
    if (!this.ctx.playerScheda) return; // esco se il player della scheda non esiste
    if (this.ctx.audioBloccatoDaUtente) return; // esco se l'utente ha bloccato esplicitamente l'audio
    this.ctx.soloBrowserBlocca = true; // segno che il blocco dipende solo dal browser
    try { this.audioGlobaleService.setSoloBrowserBlocca(true); } catch {} // notifico il fallback al servizio audio globale
    try { this.ctx.playerScheda.muted(true); } catch {} // metto il player in muto
    try { this.ctx.playerScheda.currentTime(0); } catch {} // riporto il trailer all'inizio
    try { this.ctx.playerScheda.play(); } catch {} // provo a far partire il trailer in muto
    this.preparaSbloccoAudioScheda(); // preparo la logica di sblocco audio su click
  }

  /**
   * Prepara lo sblocco audio della scheda alla prima interazione utile.
   * - Evita registrazioni duplicate
   * - Esce se l'audio e' bloccato dall'utente
   * - Su click prova a ripristinare audio e playback pieno
   * - Se il video non e' visibile chiude subito il fallback
   * - Se il video e' visibile esegue stop, reset e nuova ripartenza con audio
   *
   * @returns void
   */
  preparaSbloccoAudioScheda(): void {
    if (this.ctx.handlerSbloccoAudioScheda) return; // esco se il listener di sblocco e' gia' registrato
    if (this.ctx.audioBloccatoDaUtente) return; // esco se l'utente ha bloccato esplicitamente l'audio

    this.ctx.handlerSbloccoAudioScheda = () => {
      this.rimuoviSbloccoAudioScheda(); // rimuovo subito il listener per evitare doppie attivazioni
      if (!this.ctx.playerScheda) return; // esco se nel frattempo il player non esiste piu'
      if (this.ctx.audioBloccatoDaUtente) return; // esco se l'utente ha bloccato l'audio nel frattempo

      if (!this.ctx.mostraVideoScheda) {
        this.ctx.soloBrowserBlocca = false; // tolgo il flag di blocco solo browser
        try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {} // notifico che il fallback browser e' terminato
        try {
          if (this.ctx.contestoAudio?.state === 'suspended')
            this.ctx.contestoAudio.resume().catch(() => {}); // provo a riattivare il contesto audio se sospeso
        } catch {}
        try { this.sfumaGuadagnoVerso(1, 0); } catch {} // porto subito il gain a 1
        this.onSbloccoRiuscito(); // notifico che lo sblocco e' riuscito
        return; // esco perche' non devo riavviare il video
      }

      this.ctx.mostraVideoScheda = false; // nascondo il video durante la ripartenza pulita
      this.sfumaGuadagnoVerso(0, this.ctx.durataFadeSchedaMs).then(() => {
        try { this.ctx.playerScheda.pause(); } catch {} // metto in pausa il player corrente
        try { this.ctx.playerScheda.currentTime(0); } catch {} // riporto il trailer all'inizio
        try { this.ctx.playerScheda.muted(false); } catch {} // tolgo il mute reale dal player
        try {
          if (this.ctx.contestoAudio?.state === 'suspended')
            this.ctx.contestoAudio.resume().catch(() => {}); // provo a riattivare il contesto audio se sospeso
        } catch {}
        setTimeout(() => {
          if (this.ctx.distrutto || !this.ctx.playerScheda) return; // esco se la scheda e' stata distrutta o il player non esiste piu'
          try { this.sfumaGuadagnoVerso(0, 0); } catch {} // porto il gain a zero prima della nuova partenza
          this.ctx.mostraVideoScheda = true; // rendo di nuovo visibile il video
          try { this.sfumaGuadagnoVerso(1, this.ctx.durataFadeSchedaMs); } catch {} // faccio rientrare l'audio gradualmente
          const p = this.ctx.playerScheda.play(); // provo a riavviare il trailer con audio
          if (p && typeof p.then === 'function') {
            p.then(() => {
              this.ctx.soloBrowserBlocca = false; // tolgo il flag di blocco solo browser dopo il riavvio riuscito
              try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {} // notifico il termine del fallback browser
            }).catch(() => {
              this.ctx.mostraVideoScheda = false; // nascondo di nuovo il video se la ripartenza fallisce
              if (!this.ctx.distrutto) this.attivaFallbackSoloBrowserBlocca(); // se posso, torno nel fallback browser
            });
          }
        }, 500); // aspetto prima di ripartire con il trailer
      });
    };

    window.addEventListener('click', this.ctx.handlerSbloccoAudioScheda, { once: true, passive: true, capture: true }); // registro il click globale che prova lo sblocco audio
  }

  /**
   * Rimuove il listener usato per lo sblocco audio della scheda.
   *
   * @returns void
   */
  rimuoviSbloccoAudioScheda(): void {
    const h = this.ctx.handlerSbloccoAudioScheda; // recupero il listener attualmente registrato
    if (!h) return; // esco se non c'e' nulla da rimuovere
    try { window.removeEventListener('click', h, true); } catch {} // provo a rimuovere il listener globale
    this.ctx.handlerSbloccoAudioScheda = null; // azzero il riferimento al listener
  }

  /**
   * Disconnette i nodi WebAudio e pulisce i riferimenti collegati.
   *
   * @returns void
   */
  disconnettiNodi(): void {
    try { this.ctx.nodoSorgente?.disconnect?.(); } catch {} // provo a disconnettere il nodo sorgente
    try { this.ctx.nodoGuadagno?.disconnect?.(); } catch {} // provo a disconnettere il gain node
    this.ctx.nodoSorgente = null; // pulisco il riferimento al nodo sorgente
    this.ctx.nodoGuadagno = null; // pulisco il riferimento al gain node
    this.ctx.elementoVideoReale = null; // pulisco il riferimento al video reale
  }
}
