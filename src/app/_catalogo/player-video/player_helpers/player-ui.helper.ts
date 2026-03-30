// Helper che gestisce gli aspetti puramente UI e DOM del player, inclusi freeze frame, cerchio centrale play/pausa, inattivita', toggle del tempo e aggiornamento etichette dei menu.

import { TranslateService } from '@ngx-translate/core';

export class PlayerUiHelper {
  playerInPausa = true; // stato pausa letto dal componente per il template

  freezeCanvas: HTMLCanvasElement | null = null; // canvas usato per il freeze frame
  freezeAttiva = false; // se il freeze frame e' attualmente attivo

  private inactivityTimeout?: ReturnType<typeof setTimeout>; // timer usato per la scomparsa della UI per inattivita'

  constructor(private translate: TranslateService) {}

  /**
   * Mostra un freeze frame del video nell'area utile del player.
   * - Recupera player root, video reale e area tracce
   * - Crea il canvas freeze se ancora non esiste
   * - Calcola dimensioni e posizione del canvas in base all'area utile
   * - Disegna il frame corrente del video sul canvas
   * - Aggancia il canvas al player e segna il freeze come attivo
   *
   * @param p Istanza del player Video.js.
   * @returns void
   */
  mostraFreezeFrame(p: any): void {
    try {
      const playerEl = p?.el?.() as HTMLElement | null; // recupero il root DOM del player
      const videoEl = playerEl?.querySelector('video.vjs-tech') as HTMLVideoElement | null; // recupero il video reale del player
      const trackEl = playerEl?.querySelector('.vjs-text-track-display') as HTMLElement | null; // recupero l'area usata come riferimento visivo
      if (!playerEl || !videoEl || !trackEl) return; // se manca uno degli elementi necessari esco subito

      if (!this.freezeCanvas) {
        this.freezeCanvas = document.createElement('canvas'); // creo il canvas del freeze frame solo la prima volta
        this.freezeCanvas.className = 'vjs-player-freeze'; // assegno la classe CSS del freeze canvas
        this.freezeCanvas.style.pointerEvents = 'none'; // evito che il canvas intercetti gli eventi utente
      }

      const rootRect = playerEl.getBoundingClientRect(); // leggo il rettangolo del root player
      const regionRect = trackEl.getBoundingClientRect(); // leggo il rettangolo dell'area da congelare
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1)); // calcolo un device pixel ratio minimo di sicurezza

      this.freezeCanvas.width = Math.max(1, Math.floor(regionRect.width * dpr)); // imposto la larghezza reale del canvas in pixel
      this.freezeCanvas.height = Math.max(1, Math.floor(regionRect.height * dpr)); // imposto l'altezza reale del canvas in pixel

      const left = Math.max(0, Math.round(regionRect.left - rootRect.left)); // calcolo la posizione orizzontale del canvas rispetto al root
      const top = Math.max(0, Math.round(regionRect.top - rootRect.top)); // calcolo la posizione verticale del canvas rispetto al root
      Object.assign(this.freezeCanvas.style, {
        position: 'absolute',
        left: left + 'px',
        top: top + 'px',
        width: Math.round(regionRect.width) + 'px',
        height: Math.round(regionRect.height) + 'px',
      }); // applico al canvas la posizione e la dimensione CSS corrette

      const ctx = this.freezeCanvas.getContext('2d'); // recupero il contesto 2D del canvas
      if (!ctx) return; // se non ottengo il contesto esco subito
      ctx.drawImage(videoEl, 0, 0, this.freezeCanvas.width, this.freezeCanvas.height); // disegno sul canvas il frame corrente del video
      if (!this.freezeCanvas.isConnected) playerEl.appendChild(this.freezeCanvas); // se il canvas non e' gia' nel DOM lo aggiungo al player
      this.freezeAttiva = true; // segno che il freeze frame e' ora attivo
    } catch {} // ignoro eventuali errori di lettura o disegno del freeze frame
  }

  /**
   * Nasconde il freeze frame attualmente mostrato.
   * - Rimuove il canvas dal DOM se collegato
   * - Aggiorna il flag interno di freeze attivo
   *
   * @returns void
   */
  nascondiFreezeFrame(): void {
    if (this.freezeCanvas?.isConnected) this.freezeCanvas.remove(); // se il canvas freeze e' nel DOM lo rimuovo
    this.freezeAttiva = false; // segno che il freeze frame non e' piu' attivo
  }

  /**
   * Gestisce l'aggiornamento UI quando il player entra in play.
   * - Aggiorna lo stato pausa
   * - Nasconde il cerchio centrale
   * - Rimuove l'eventuale stato fisso del cerchio
   *
   * @returns void
   */
  onPlay(): void {
    this.playerInPausa = false; // segno che il player non e' piu' in pausa
    const cerchio = document.querySelector('.vjs-cerchio-centrale') as HTMLElement | null; // recupero il cerchio centrale del player
    if (cerchio) {
      cerchio.classList.remove('fisso'); // tolgo lo stato fisso del cerchio
      cerchio.classList.remove('visibile'); // nascondo il cerchio centrale
    }
  }

  /**
   * Gestisce l'aggiornamento UI quando il player entra in pausa.
   * - Aggiorna lo stato pausa
   * - Mostra il cerchio centrale
   * - Se necessario applica la transizione prima di fissarlo visivamente
   *
   * @returns void
   */
  onPause(): void {
    const cerchio = document.querySelector('.vjs-cerchio-centrale') as HTMLElement | null; // recupero il cerchio centrale del player
    if (!cerchio) {
      this.playerInPausa = true; // se il cerchio non esiste aggiorno comunque lo stato pausa
      return;
    }

    if (cerchio.classList.contains('visibile') && !cerchio.classList.contains('fisso')) {
      cerchio.classList.remove('visibile'); // nascondo momentaneamente il cerchio se era gia' visibile ma non fisso
      setTimeout(() => {
        this.playerInPausa = true; // aggiorno lo stato pausa dopo il piccolo ritardo visivo
        cerchio.classList.add('visibile'); // rendo di nuovo visibile il cerchio
        cerchio.classList.add('fisso'); // lo fisso visivamente nello stato pausa
      }, 320);
    } else {
      this.playerInPausa = true; // aggiorno subito lo stato pausa
      cerchio.classList.add('visibile'); // rendo visibile il cerchio
      cerchio.classList.add('fisso'); // lo fisso visivamente
    }
  }

  /**
   * Collega gli handler di inattivita' del player al contenitore video.
   * - Reagisce al mousemove mostrando anche il cerchio
   * - Reagisce al touchstart senza usare il cerchio
   * - Inizializza il timer interno di inattivita'
   *
   * @param videoElement Elemento HTML del video o contenitore su cui ascoltare l'attivita' utente.
   * @returns void
   */
  bindInactivity(videoElement: HTMLElement): void {
    videoElement.addEventListener('mousemove', () => this.onActivity(true)); // sul movimento mouse tratto l'evento come attivita' con cerchio
    videoElement.addEventListener('touchstart', () => this.onActivity(false)); // sul touch tratto l'evento come attivita' senza cerchio
    this.inactivityTimeout = setTimeout(() => {}, 2000); // inizializzo il timer interno di inattivita'
  }

  /**
   * Gestisce l'attivita' utente per mostrare o nascondere la UI del player.
   * - Rende di nuovo visibile la control bar senza transizione
   * - Mostra opzionalmente il cerchio centrale
   * - Resetta il timer di inattivita'
   * - Dopo il timeout nasconde control bar e, se previsto, il cerchio
   *
   * @param withCerchio Se true gestisce anche la visibilita' del cerchio centrale.
   * @returns void
   */
  private onActivity(withCerchio: boolean): void {
    const cb = document.querySelector('.vjs-control-bar.show-control-bar') as HTMLElement | null; // recupero la control bar attualmente visibile
    if (cb) cb.classList.remove('vjs-control-bar-transition'); // tolgo la classe di transizione quando rilevo attivita'

    if (withCerchio) {
      const cerchio = document.querySelector('.vjs-cerchio-centrale') as HTMLElement | null; // recupero il cerchio centrale del player
      if (cerchio) cerchio.classList.add('visibile'); // se richiesto rendo visibile il cerchio
    }

    clearTimeout(this.inactivityTimeout); // azzero il timeout precedente di inattivita'
    this.inactivityTimeout = setTimeout(() => {
      const cb2 = document.querySelector('.vjs-control-bar.show-control-bar') as HTMLElement | null; // recupero di nuovo la control bar visibile al momento dello scadere
      if (cb2) {
        cb2.classList.remove('show-control-bar'); // tolgo la classe che mantiene visibile la control bar
        cb2.classList.add('vjs-control-bar-transition'); // aggiungo la classe di transizione per la scomparsa
      }
      if (withCerchio) {
        const cerchio = document.querySelector('.vjs-cerchio-centrale') as HTMLElement | null; // recupero il cerchio centrale al momento dello scadere
        if (cerchio && !cerchio.classList.contains('fisso')) cerchio.classList.remove('visibile'); // nascondo il cerchio solo se non e' nello stato fisso
      }
    }, 2000); // riprogrammo la scomparsa UI dopo 2 secondi di inattivita'
  }

  /**
   * Collega il toggle tra tempo trascorso e tempo rimanente.
   * - Imposta il title iniziale coerente
   * - Definisce la logica di toggle tra current time e remaining time
   * - Reagisce ai click sui due elementi tempo
   *
   * @param playerEl Root DOM del player.
   * @returns void
   */
  bindTimeToggle(playerEl: HTMLElement): void {
    const aggiornaTitle = (mostraTrascorso: boolean) => {
      const ct = playerEl.querySelector('.vjs-current-time') as HTMLElement | null; // recupero l'elemento del tempo corrente
      const rt = playerEl.querySelector('.vjs-remaining-time') as HTMLElement | null; // recupero l'elemento del tempo rimanente
      const title = mostraTrascorso
        ? this.translate.instant('ui.videojs.mostra_rimanente')
        : this.translate.instant('ui.videojs.mostra_trascorso'); // costruisco il title corretto in base allo stato opposto che verra' mostrato
      if (ct) ct.title = title; // aggiorno il title del tempo corrente se esiste
      if (rt) rt.title = title; // aggiorno il title del tempo rimanente se esiste
    };

    const toggleDisplay = () => {
      const ct = playerEl.querySelector('.vjs-current-time') as HTMLElement | null; // recupero l'elemento del tempo corrente
      const rt = playerEl.querySelector('.vjs-remaining-time') as HTMLElement | null; // recupero l'elemento del tempo rimanente
      if (!ct || !rt) return; // se manca uno dei due elementi esco subito
      if (rt.style.display !== 'none') {
        rt.style.display = 'none'; // nascondo il tempo rimanente
        ct.style.display = 'block'; // mostro il tempo trascorso
        aggiornaTitle(true); // aggiorno i title coerentemente al nuovo stato
      } else {
        rt.style.display = 'block'; // mostro il tempo rimanente
        ct.style.display = 'none'; // nascondo il tempo trascorso
        aggiornaTitle(false); // aggiorno i title coerentemente al nuovo stato
      }
    };

    aggiornaTitle(false); // imposto il title iniziale assumendo la vista predefinita
    playerEl.addEventListener('click', (event) => {
      const target = event.target as HTMLElement; // recupero il target del click
      if (target.closest('.vjs-current-time') || target.closest('.vjs-remaining-time')) toggleDisplay(); // se il click cade su uno dei due campi tempo eseguo il toggle
    });
  }

  /**
   * Aggiorna le etichette dei menu audio e sottotitoli in base alla lingua utente.
   * - Legge la lingua utente salvata
   * - Normalizza le voci del menu audio
   * - Normalizza le voci del menu sottotitoli
   * - Traduce le etichette conosciute nelle due lingue supportate
   *
   * @returns void
   */
  updateMenuLabels(): void {
    setTimeout(() => {
      const lang = localStorage.getItem('lingua_utente') === 'italiano' ? 'it' : 'en'; // ricavo la lingua utente da usare per localizzare le voci

      document
        .querySelectorAll('.vjs-audio-button .vjs-menu-content .vjs-menu-item')
        .forEach((item) => {
          const t = item.textContent?.trim().toLowerCase(); // leggo e normalizzo il testo della singola voce audio
          if (t?.includes('inglese') || t?.includes('english'))
            item.textContent = lang === 'it' ? 'Inglese' : 'English'; // riallineo la voce inglese nella lingua utente
          if (t?.includes('italiano') || t?.includes('italian'))
            item.textContent = lang === 'it' ? 'Italiano' : 'Italian'; // riallineo la voce italiana nella lingua utente
        });

      document
        .querySelectorAll('.vjs-subs-caps-button .vjs-menu-content .vjs-menu-item')
        .forEach((item) => {
          const t = item.textContent?.trim().toLowerCase(); // leggo e normalizzo il testo della singola voce sottotitoli
          if (
            t?.includes('caption settings') ||
            t?.includes('captions settings') ||
            t?.includes('subtitle setting') ||
            t?.includes('subtitle settings') ||
            t?.includes('subtitle option') ||
            t?.includes('subtitle options') ||
            t?.includes('subtitles setting') ||
            t?.includes('subtitles settings') ||
            t?.includes('opzioni sottotitoli')
          ) {
            item.textContent = lang === 'it' ? 'Opzioni sottotitoli' : 'Subtitle options';
          } // riallineo la voce opzioni sottotitoli nella lingua utente

          if (
            t === 'off' ||
            t?.includes('caption off') ||
            t?.includes('subtitles off') ||
            t?.includes('sottotitoli off')
          )
            item.textContent = lang === 'it' ? 'Sottotitoli Off' : 'Subtitles Off'; // riallineo la voce dei sottotitoli disattivati

          if (t?.includes('english') || t?.includes('inglese'))
            item.textContent = lang === 'it' ? 'Inglese' : 'English'; // riallineo la voce inglese nella lingua utente
          if (t?.includes('italian') || t?.includes('italiano'))
            item.textContent = lang === 'it' ? 'Italiano' : 'Italian'; // riallineo la voce italiana nella lingua utente
        });
    }, 100); // lascio passare un piccolo ritardo prima di aggiornare le label del menu
  }
}
