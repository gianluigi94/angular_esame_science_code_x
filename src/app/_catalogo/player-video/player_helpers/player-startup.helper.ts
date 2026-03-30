// Helper che gestisce la sequenza di avvio del player, inclusi maschera iniziale, doppio avvio, fallback mutato, cambio lingua audio e attese legate al buffer.

import { TranslateService } from '@ngx-translate/core';
import { SchedaProntaService } from '../../scheda/scheda_service/scheda-pronta.service';
import { PlayerAudioService } from '../player_service/player-audio.service';
import { PlayerStateContext } from '../player_utility/player-state.context';
import {
  sleep,
  calcolaBufferedEndCompat,
  waitForFullscreen,
} from '../player_utility/player-buffer.utils';

export class PlayerStartupHelper {
  private startupMaskEl: HTMLDivElement | null = null; // riferimento alla maschera di avvio sopra il player

  readonly START_BUFFER_S = 5; // quanti secondi di buffer iniziale provo a raggiungere da zero
  readonly WARMUP_MUTO_MS = 1000; // quanti ms tengo il play di warmup in muto

  constructor(
    private ctx: PlayerStateContext,
    private audio: PlayerAudioService,
    private schedaPronta: SchedaProntaService,
    private translate: TranslateService,
  ) {}

  /**
   * Crea la maschera di avvio del player se non esiste ancora.
   * - Recupera il root del player
   * - Crea l'elemento DOM della maschera solo una volta
   * - Lo aggiunge al player con stato iniziale nascosto
   *
   * @returns void
   */
  creaMascheraAvvio(): void {
    try {
      const root = this.ctx.player?.el?.() as HTMLElement | null; // recupero il root DOM del player
      if (!root) return; // se il root non esiste esco subito
      if (!this.startupMaskEl) {
        this.startupMaskEl = document.createElement('div'); // creo l'elemento DOM della maschera di avvio
        this.startupMaskEl.className = 'vjs-startup-mask vjs-startup-mask--hide'; // imposto le classi iniziali della maschera
        root.appendChild(this.startupMaskEl); // aggiungo la maschera al root del player
      }
    } catch {} // ignoro eventuali errori di creazione o append della maschera
  }

  /**
   * Mostra la maschera di avvio sopra il player.
   * - Si assicura che la maschera esista
   * - La riaggancia al root se necessario
   * - La rende visibile
   * - Porta l'audio a zero e mette il player in muto
   *
   * @returns void
   */
  mostraMascheraAvvio(): void {
    this.creaMascheraAvvio(); // mi assicuro che la maschera di avvio esista

    try {
      const root = this.ctx.player?.el?.() as HTMLElement | null; // recupero il root DOM del player
      if (root && this.startupMaskEl) {
        try {
          root.appendChild(this.startupMaskEl);
        } catch {}
      } // provo a riagganciare la maschera al root se necessario
      this.startupMaskEl?.classList.remove('vjs-startup-mask--hide'); // rendo visibile la maschera togliendo la classe hide
      void this.startupMaskEl?.offsetWidth; // forzo un reflow per consolidare la transizione visiva
      this.audio.setGain(0); // porto subito il gain audio a zero
      try {
        this.ctx.player?.muted?.(true);
      } catch {} // provo a mettere il player in muto
    } catch {} // ignoro eventuali errori di manipolazione della maschera

    setTimeout(() => {
      try {
        this.startupMaskEl?.classList.remove('vjs-startup-mask--hide');
      } catch {}
    }, 0); // riprovo al tick successivo a togliere la classe hide per sicurezza
  }

  /**
   * Nasconde la maschera di avvio del player.
   * - Aggiunge la classe di hide alla maschera
   * - Ripristina la visibilita' dell'header della scheda
   *
   * @returns void
   */
  nascondiMascheraAvvio(): void {
    if (!this.startupMaskEl) return; // se la maschera non esiste non faccio nulla
    this.startupMaskEl.classList.add('vjs-startup-mask--hide'); // nascondo la maschera aggiungendo la classe hide
    this.schedaPronta.impostaHeaderNascosto(false); // ripristino lo stato visibile dell'header della scheda
  }

  /**
   * Rimuove definitivamente la maschera di avvio dal DOM.
   *
   * @returns void
   */
  destroyMask(): void {
    try {
      this.startupMaskEl?.remove();
    } catch {} // provo a rimuovere la maschera dal DOM senza bloccare il flusso
  }

  /**
   * Esegue la sequenza di doppio avvio del player quando richiesta.
   * - Verifica il fullscreen entro un timeout
   * - Mostra la maschera di avvio e prepara il player in muto
   * - Attende le audio tracks e forza un primo avvio con lingua opposta
   * - Ferma, torna a zero, reimposta la lingua corretta e attende buffer
   * - Esegue warmup mutato, nuova pausa e ritorno a zero
   * - Avvia infine il play reale con audio e fade-in finale
   * - In caso di errore passa al fallback mutato
   *
   * @returns Promise<void>
   */
  async doppioAvvioSeRichiesto(): Promise<void> {
    this.ctx.doppioAvvioEseguito = true; // segno subito che la sequenza di doppio avvio e' stata avviata

    try {
      const p = this.ctx.player; // recupero il player corrente dal contesto
      if (!p) return; // se il player non esiste esco subito

      const root = p.el?.() as HTMLElement | null; // recupero il root DOM del player
      const fullscreenOk = await waitForFullscreen(root, 2500); // aspetto che il fullscreen sia davvero disponibile entro il timeout
      if (!fullscreenOk) {
        await this.avviaFallbackMutato();
        return;
      } // se il fullscreen non arriva passo al fallback mutato

      this.mostraMascheraAvvio(); // mostro la maschera di avvio sopra il player
      const fallbackTimer = setTimeout(() => this.nascondiMascheraAvvio(), 30000); // preparo un timer di sicurezza che nasconde comunque la maschera
      this.audio.setGain(0); // porto il gain audio a zero all'inizio della sequenza
      try {
        p.muted?.(true);
      } catch {} // provo a mettere il player in muto

      const tracks = await this.waitForAudioTracks(2000); // aspetto la disponibilita' delle audio tracks
      if (!tracks || tracks.length === 0) return; // se non arrivano tracce audio esco senza proseguire

      const corretta = this.deduciLinguaCorretta(); // deduco quale sia la lingua audio corretta da usare davvero
      const opposta: 'en' | 'it' = corretta === 'it' ? 'en' : 'it'; // ricavo la lingua opposta da usare nella prima fase

      try {
        p.currentTime?.(0);
      } catch {} // provo a riportare il player all'inizio
      await this.impostaLinguaAudio(opposta, false, false); // imposto prima la lingua opposta senza smooth switch
      await sleep(120); // aspetto un attimo per lasciare assestare il cambio traccia

      await new Promise<void>((resolve) => {
        let ok = false; // flag che mi dice se ho visto avanzare davvero il tempo
        const onTime = () => {
          if (Number(p.currentTime?.() ?? 0) >= 0.08) {
            ok = true; // segno che il player ha davvero iniziato a muoversi
            off(); // chiudo i listener e risolvo
          }
        };
        const off = () => {
          p.off?.('timeupdate', onTime); // rimuovo il listener di timeupdate
          resolve(); // risolvo l'attesa del primo micro-avvio
        };
        p.on?.('timeupdate', onTime); // ascolto il timeupdate per capire se il player e' davvero partito
        Promise.resolve(p.play?.())
          .catch(() => {})
          .finally(async () => {
            await sleep(600); // aspetto un piccolo tempo massimo per questo micro-avvio
            if (!ok) off(); // se non ho visto avanzamento chiudo comunque
          });
      });

      this.ctx.playInterno = true; // segno che sto per eseguire una pausa interna controllata
      try {
        this.ctx.originalPause?.();
      } catch {
        try {
          p.pause?.();
        } catch {}
      } // provo a mettere in pausa il player con fallback sulla pause standard
      this.ctx.playInterno = false; // ripristino il flag di play interno
      await sleep(150); // aspetto un attimo dopo la pausa
      try {
        p.currentTime?.(0);
      } catch {} // riporto di nuovo il player a zero

      await this.impostaLinguaAudio(corretta, false, false); // imposto ora la lingua corretta
      await this.waitBufferFromZero(this.START_BUFFER_S, 12000); // aspetto che da zero si accumuli il buffer minimo richiesto

      try {
        p.currentTime?.(0);
      } catch {} // riparto ancora da zero per la fase di warmup mutato
      this.audio.setGain(0); // tengo il gain audio a zero durante il warmup
      try {
        p.muted?.(true);
      } catch {} // mi assicuro che il player resti mutato
      try {
        const ve = p.tech?.(true)?.el?.() as HTMLVideoElement | undefined; // provo a recuperare il video element reale del tech
        if (ve) ve.muted = true; // se esiste lo tengo mutato anche a livello di elemento reale
      } catch {}
      this.ctx.playInterno = true; // segno che sto per eseguire una play interna controllata
      try {
        await Promise.resolve(this.ctx.originalPlay?.());
      } catch {} // provo ad avviare il warmup mutato
      this.ctx.playInterno = false; // ripristino il flag di play interno
      await sleep(this.WARMUP_MUTO_MS); // lascio andare il warmup mutato per il tempo previsto

      this.ctx.playInterno = true; // segno che sto per eseguire una pausa interna controllata
      try {
        this.ctx.originalPause?.();
      } catch {} // provo a mettere in pausa dopo il warmup
      this.ctx.playInterno = false; // ripristino il flag di play interno
      await sleep(60); // aspetto un piccolo intervallo prima di tornare a zero
      try {
        p.currentTime?.(0);
      } catch {} // riporto il player a zero prima del play reale

      try {
        p.muted?.(false);
      } catch {} // provo a togliere il muto dal player
      try {
        const ve = p.tech?.(true)?.el?.() as HTMLVideoElement | undefined; // recupero di nuovo il video element reale del tech
        if (ve) {
          ve.muted = false; // tolgo il muto al video element reale
          if (ve.volume === 0) ve.volume = 1; // se il volume reale e' a zero lo riporto a uno
        }
      } catch {}
      this.audio.setGain(0); // tengo il gain a zero anche all'inizio del play reale
      this.ctx.avvioConsentito = false; // blocco temporaneamente l'avvio logico finche' non ho headroom sufficiente
      this.agganciaNascondiSuPrimoFrame(p, fallbackTimer); // preparo la chiusura della maschera sul primo frame utile

      this.ctx.playInterno = true; // segno che sto per eseguire una play interna controllata
      try {
        await Promise.resolve(this.ctx.originalPlay?.());
      } catch {} // provo ad avviare il play reale
      this.ctx.playInterno = false; // ripristino il flag di play interno

      await this.waitMinHeadroom(2.0, 5000); // aspetto di avere abbastanza headroom di buffer prima di sbloccare il player
      this.ctx.avvioConsentito = true; // riabilito l'avvio logico del player
      await this.audio.fadeGainTo(1, this.audio.FADE_PLAY_MS); // faccio rientrare gradualmente l'audio
      try {
        this.audio.setGain(1);
      } catch {} // mi assicuro infine che il gain arrivi davvero a uno
      this.ctx.doppioAvvioEseguito = true; // confermo che la sequenza di doppio avvio e' stata completata
      this.mostraMessaggioDisclaimer(); // mostro il messaggio informativo finale
    } catch {
      await this.avviaFallbackMutato(); // se qualcosa fallisce ripiego sul fallback mutato
    }
  }

  /**
   * Avvia il fallback mutato del player.
   * - Porta l'audio a zero e mette il player in muto
   * - Avvia il player in modalita' mutata
   * - Aggancia la chiusura della maschera sul primo frame utile
   * - Riabilita l'avvio logico e mostra il disclaimer
   *
   * @returns Promise<void>
   */
  async avviaFallbackMutato(): Promise<void> {
    try {
      const p = this.ctx.player; // recupero il player corrente dal contesto
      if (!p) return; // se il player non esiste esco subito
      this.ctx.avvioConsentito = false; // blocco temporaneamente l'avvio logico
      this.audio.setGain(0); // porto il gain audio a zero
      try {
        p.muted?.(true);
      } catch {} // provo a mettere il player in muto
      try {
        const ve = p.tech?.(true)?.el?.() as HTMLVideoElement | undefined; // provo a recuperare il video element reale del tech
        if (ve) ve.muted = true; // se esiste lo tengo mutato
      } catch {}
      this.ctx.playInterno = true; // segno che sto per eseguire una play interna controllata
      try {
        await Promise.resolve(this.ctx.originalPlay?.());
      } catch {} // provo a far partire il player nel fallback mutato
      this.ctx.playInterno = false; // ripristino il flag di play interno
      const fallbackTimer = setTimeout(() => this.nascondiMascheraAvvio(), 30000); // preparo comunque un timer di sicurezza per chiudere la maschera
      this.agganciaNascondiSuPrimoFrame(p, fallbackTimer); // preparo la chiusura della maschera al primo frame utile
      this.ctx.avvioConsentito = true; // riabilito l'avvio logico del player
      this.mostraMessaggioDisclaimer(); // mostro il messaggio disclaimer finale
    } catch {} // ignoro eventuali errori del fallback mutato
  }

  /**
   * Aggancia la chiusura della maschera di avvio al primo frame utile del player.
   * - Usa requestVideoFrameCallback se disponibile
   * - Altrimenti si appoggia a loadeddata, playing e timeupdate
   * - Alla prima occasione utile nasconde la maschera e pulisce il timer fallback
   *
   * @param p Istanza del player Video.js.
   * @param fallbackTimer Timer di sicurezza da annullare quando la maschera viene nascosta davvero.
   * @returns void
   */
  agganciaNascondiSuPrimoFrame(p: any, fallbackTimer: any): void {
    const tech: any = p?.tech?.(true); // recupero il tech corrente del player
    const video: HTMLVideoElement | undefined = tech?.el?.(); // provo a recuperare il video element reale del tech
    let done = false; // flag che mi evita di chiudere la maschera piu' volte

    const cleanup = () => {
      if (done) return; // se ho gia' pulito non faccio nulla
      done = true; // segno che la pulizia e' gia' stata eseguita
      p.off?.('loadeddata', onLoadedPaint); // rimuovo il listener di loadeddata
      p.off?.('playing', onLoadedPaint); // rimuovo il listener di playing
      p.off?.('timeupdate', onLoadedPaint); // rimuovo il listener di timeupdate
    };

    const hideNow = () => {
      cleanup(); // pulisco subito tutti i listener di supporto
      this.waitMinHeadroom(2.0, 5000).finally(() => {
        this.nascondiMascheraAvvio(); // nascondo la maschera quando ho finito la fase minima di assestamento
        clearTimeout(fallbackTimer); // annullo il timer fallback una volta nascosta la maschera
      });
    };

    const onLoadedPaint = () =>
      requestAnimationFrame(() => requestAnimationFrame(hideNow)); // aspetto due frame prima di nascondere la maschera

    try {
      if (video && (video as any).requestVideoFrameCallback) {
        (video as any).requestVideoFrameCallback(() => hideNow()); // se disponibile mi aggancio al primo vero frame video renderizzato
      } else {
        p.on?.('loadeddata', onLoadedPaint); // altrimenti ascolto loadeddata
        p.on?.('playing', onLoadedPaint); // ascolto anche playing
        p.on?.('timeupdate', onLoadedPaint); // e ascolto anche timeupdate come ulteriore fallback
      }
      if (video && video.readyState >= 2) onLoadedPaint(); // se il video e' gia' pronto provo subito a partire con la chiusura
    } catch {
      p.on?.('loadeddata', onLoadedPaint);
    } // se qualcosa fallisce mi appoggio almeno a loadeddata
  }

  /**
   * Mostra il messaggio disclaimer del player dopo un ritardo opzionale.
   *
   * @param ritardoMs Ritardo in millisecondi prima di mostrare il messaggio.
   * @returns void
   */
  mostraMessaggioDisclaimer(ritardoMs = 4000): void {
    setTimeout(() => {
      try {
        const playerEl = this.ctx.player?.el?.() as HTMLElement | null; // recupero il root DOM del player
        if (!playerEl) return; // se il root non esiste esco subito
        const msg = document.createElement('div'); // creo l'elemento DOM che conterra' il messaggio
        msg.className = 'vjs-startup-message'; // imposto la classe CSS del messaggio
        msg.textContent = this.translate.instant('ui.videojs.disclaimer'); // traduco e assegno il testo del disclaimer
        playerEl.appendChild(msg); // aggiungo il messaggio al player
        setTimeout(() => msg.remove(), 9500); // rimuovo automaticamente il messaggio dopo il tempo previsto
      } catch {}
    }, ritardoMs); // faccio partire il messaggio dopo il ritardo richiesto
  }

  /**
   * Imposta la lingua audio del player.
   * - Recupera le audio tracks disponibili
   * - Disabilita tutte le tracce
   * - Abilita solo quelle compatibili con la lingua richiesta
   * - Se richiesto applica un piccolo smooth switch sul currentTime
   *
   * @param lang Lingua audio da attivare.
   * @param _persist Parametro presente ma non usato in questa implementazione.
   * @param smooth Se true applica un piccolo aggiustamento del currentTime.
   * @returns Promise<void>
   */
  async impostaLinguaAudio(lang: 'en' | 'it', _persist = true, smooth = false): Promise<void> {
    try {
      const tr = this.ctx.player?.audioTracks?.(); // recupero la lista delle audio tracks del player
      if (!tr) return; // se non ho tracce audio disponibili esco subito
      const target = lang === 'it' ? ['italiano', 'italian'] : ['inglese', 'english']; // preparo i label compatibili con la lingua richiesta
      for (let i = 0; i < tr.length; i++) tr[i].enabled = false; // disabilito tutte le tracce audio prima della nuova selezione
      for (let i = 0; i < tr.length; i++) {
        const lbl = (tr[i].label || '').toLowerCase(); // normalizzo il label della traccia corrente
        if (target.some((t) => lbl.includes(t))) tr[i].enabled = true; // abilito la traccia se il label corrisponde alla lingua richiesta
      }
      if (smooth) {
        const t = Number(this.ctx.player?.currentTime?.() ?? 0); // salvo il tempo corrente del player
        try {
          this.ctx.player?.currentTime?.(Math.max(0, t + 0.5)); // sposto leggermente avanti il currentTime
          await sleep(30); // aspetto un istante
          this.ctx.player?.currentTime?.(t); // riporto il currentTime al valore originario
        } catch {}
      }
    } catch {} // ignoro eventuali errori di selezione traccia audio
  }

  /**
   * Esegue lo switch della lingua audio durante la riproduzione.
   * - Salva se il player stava suonando
   * - Fa fade-out audio e mette in pausa il player
   * - Cambia la lingua audio con smooth switch
   * - Si aggancia a canplay per riprendere il player e fare fade-in
   * - Applica anche un timeout di fallback se canplay non arriva
   *
   * @param lang Lingua audio da attivare.
   * @returns Promise<void>
   */
  async switchAudio(lang: 'en' | 'it'): Promise<void> {
    const p = this.ctx.player; // recupero il player corrente
    const stavaSuonando = !p?.paused?.(); // mi salvo se il player stava effettivamente riproducendo
    await Promise.resolve(this.audio.audioCtx?.resume?.()).catch(() => {}); // provo a riattivare il contesto audio
    await this.audio.fadeGainTo(0, this.audio.FADE_PAUSA_MS); // porto l'audio a zero prima dello switch
    this.ctx.playInterno = true; // segno che sto per eseguire una pausa interna controllata
    try {
      this.ctx.originalPause?.();
    } catch {
      try {
        p?.pause?.();
      } catch {}
    } // provo a mettere in pausa il player con fallback sulla pause standard
    await this.impostaLinguaAudio(lang, true, true); // imposto la nuova lingua audio con smooth switch
    const t = Number(p?.currentTime?.() ?? 0); // rileggo il currentTime corrente dopo il cambio lingua
    try {
      p?.currentTime?.(t + 0.01);
    } catch {} // applico un piccolo avanzamento per sbloccare meglio il nuovo stream audio

    const onReady = async () => {
      p?.off?.('canplay', onReady); // rimuovo il listener canplay appena viene eseguito
      if (stavaSuonando) {
        try {
          await Promise.resolve(this.ctx.originalPlay?.());
        } catch {} // se il player stava suonando provo a farlo ripartire
        this.ctx.playInterno = false; // ripristino il flag di play interno
        await this.audio.fadeGainTo(1, this.audio.FADE_PLAY_MS); // faccio rientrare l'audio con fade-in
      } else {
        this.ctx.playInterno = false; // se non stava suonando ripristino solo il flag interno
      }
    };

    p?.on?.('canplay', onReady); // mi aggancio a canplay per finalizzare la ripresa

    setTimeout(async () => {
      try {
        p?.off?.('canplay', onReady);
      } catch {} // dopo il timeout rimuovo comunque il listener canplay
      if (stavaSuonando) {
        try {
          await Promise.resolve(this.ctx.originalPlay?.());
        } catch {} // se il player stava suonando provo comunque a farlo ripartire
        this.ctx.playInterno = false; // ripristino il flag di play interno
        await this.audio.fadeGainTo(1, this.audio.FADE_PLAY_MS); // faccio rientrare l'audio anche nel fallback timeout
      } else {
        this.ctx.playInterno = false; // se non stava suonando ripristino solo il flag interno
      }
    }, 600); // preparo un fallback timeout nel caso canplay non arrivi
  }

  /**
   * Deduca la lingua audio corretta da usare.
   * - Controlla prima il valore salvato in localStorage
   * - Se non basta, ispeziona le audio tracks attive del player
   * - In ultima istanza usa la lingua corrente del contesto
   *
   * @returns {'en'|'it'} Lingua audio dedotta come corretta.
   */
  deduciLinguaCorretta(): 'en' | 'it' {
    const saved = localStorage.getItem('video_lingua'); // leggo l'eventuale lingua video salvata in localStorage
    if (saved === 'italiano') return 'it'; // se trovo italiano restituisco it
    if (saved === 'inglese') return 'en'; // se trovo inglese restituisco en

    try {
      const tr: any = this.ctx.player?.audioTracks?.(); // provo a recuperare le audio tracks del player
      if (tr) {
        for (let i = 0; i < tr.length; i++) {
          const lbl = (tr[i].label || '').toLowerCase(); // normalizzo il label della traccia corrente
          if (tr[i].enabled && (lbl.includes('italiano') || lbl.includes('italian'))) return 'it'; // se la traccia attiva e' italiana restituisco it
          if (tr[i].enabled && (lbl.includes('inglese') || lbl.includes('english'))) return 'en'; // se la traccia attiva e' inglese restituisco en
        }
      }
    } catch {} // ignoro eventuali errori di lettura delle audio tracks

    return this.ctx.currentLang; // in ultima istanza uso la lingua corrente del contesto
  }

  /**
   * Attende che le audio tracks del player siano disponibili.
   *
   * @param timeoutMs Tempo massimo di attesa in millisecondi.
   * @returns Promise<any[] | null> Elenco delle audio tracks oppure null se non disponibili entro il timeout.
   */
  async waitForAudioTracks(timeoutMs: number): Promise<any[] | null> {
    const p = this.ctx.player; // recupero il player corrente
    const start = Date.now(); // salvo il timestamp iniziale dell'attesa

    while (Date.now() - start < timeoutMs) {
      try {
        const tr = p?.audioTracks?.(); // provo a leggere le audio tracks del player
        if (tr && tr.length > 0) return Array.from({ length: tr.length }, (_, i) => tr[i]); // se le tracce esistono le restituisco come array
      } catch {}
      await sleep(50); // aspetto un piccolo intervallo prima del tentativo successivo
    }

    try {
      const tr = p?.audioTracks?.(); // faccio un ultimo tentativo finale fuori dal loop
      if (tr && tr.length > 0) return Array.from({ length: tr.length }, (_, i) => tr[i]); // se ora le tracce esistono le restituisco
    } catch {}

    return null; // se non ho mai ottenuto tracce audio restituisco null
  }

  /**
   * Attende che da zero venga raggiunta una certa quantita' di buffer.
   * - Riporta il player a currentTime zero
   * - Avvia il play per far accumulare buffer
   * - Controlla periodicamente buffered end
   * - Quando raggiunge la soglia mette in pausa e restituisce true
   * - Se scade il timeout mette comunque in pausa e restituisce false
   *
   * @param targetS Secondi di buffer da raggiungere.
   * @param timeoutMs Tempo massimo di attesa in millisecondi.
   * @returns Promise<boolean> True se il buffer richiesto viene raggiunto, false altrimenti.
   */
  async waitBufferFromZero(targetS: number, timeoutMs: number): Promise<boolean> {
    const p = this.ctx.player; // recupero il player corrente
    const start = Date.now(); // salvo il timestamp iniziale dell'attesa

    try {
      p?.currentTime?.(0);
    } catch {} // provo a riportare il player a zero prima di accumulare buffer
    Promise.resolve(p?.play?.()).catch(() => {}); // faccio partire il player per permettere il buffering

    while (Date.now() - start < timeoutMs) {
      if (calcolaBufferedEndCompat(p) >= targetS - 0.1) {
        this.ctx.playInterno = true; // segno che sto per eseguire una pausa interna controllata
        try {
          this.ctx.originalPause?.();
        } catch {} // provo a mettere in pausa il player appena ho buffer sufficiente
        this.ctx.playInterno = false; // ripristino il flag di play interno
        return true; // segnalo che il buffer richiesto e' stato raggiunto
      }
      await sleep(50); // aspetto un piccolo intervallo prima del controllo successivo
    }

    this.ctx.playInterno = true; // segno che sto per eseguire una pausa interna controllata
    try {
      this.ctx.originalPause?.();
    } catch {} // allo scadere del timeout provo comunque a mettere in pausa il player
    this.ctx.playInterno = false; // ripristino il flag di play interno
    return false; // segnalo che il buffer richiesto non e' stato raggiunto in tempo
  }

  /**
   * Attende che il player abbia un headroom minimo di buffer e un readyState sufficiente.
   *
   * @param minHeadroomSec Secondi minimi di headroom richiesti.
   * @param timeoutMs Tempo massimo di attesa in millisecondi.
   * @returns Promise<boolean> True se la soglia viene raggiunta entro il timeout, false altrimenti.
   */
  async waitMinHeadroom(minHeadroomSec = 2.0, timeoutMs = 4000): Promise<boolean> {
    const p = this.ctx.player; // recupero il player corrente
    const start = Date.now(); // salvo il timestamp iniziale dell'attesa

    while (Date.now() - start < timeoutMs) {
      let ct = 0; // currentTime corrente da confrontare col buffer
      try {
        ct = Number(p?.currentTime?.() ?? 0);
      } catch {} // provo a leggere il currentTime del player
      const headroom = calcolaBufferedEndCompat(p) - ct; // calcolo quanti secondi di buffer ho davanti alla posizione corrente
      let readyOk = true; // flag che mi dice se il video element ha un readyState sufficiente
      try {
        const ve = p?.tech?.(true)?.el?.() as HTMLVideoElement | undefined; // provo a recuperare il video element reale del tech
        readyOk = !!ve && ve.readyState >= 3; // considero valido solo un video element presente e con readyState sufficiente
      } catch {}
      if (readyOk && headroom >= minHeadroomSec) return true; // se ho sia readyState valido sia headroom sufficiente posso chiudere con successo
      await sleep(50); // aspetto un piccolo intervallo prima del controllo successivo
    }

    return false; // se scade il timeout segnalo che non ho raggiunto la soglia richiesta
  }
}
