// Utility che governa l’avvio e il riavvio dei trailer del carosello in modo robusto, mantenendo coerenza tra stato, timing e vincoli del browser.

import { CaroselloAudioUtility } from './carosello-audio.utility';

export class CaroselloVideoUtility {
  /**
   * Cancella eventuali avvii trailer schedulati e invalida la sequenza corrente.
   *
   * Rimuove il timer di avvio se presente e incrementa il contatore di sequenza
   * per rendere obsoleti avvii precedenti.
   *
   * @param ctx Contesto del componente/carousel
   * @returns void
   */
  static fermaAvvioPendete(ctx: any): void {
    if (ctx.timerMostra) {
      // Controllo se esiste un timer di avvio pendente
      clearTimeout(ctx.timerMostra); // Cancello il timeout di avvio
      ctx.timerMostra = null; // Azzero il riferimento al timer
    }
    ctx.numeroSequenzaAvvio++; // Incremento la sequenza per rendere obsoleti avvii precedenti
  }

  /**
   * Prova ad avviare il trailer iniziale se tutte le condizioni minime sono soddisfatte.
   *
   * Richiede player pronto e presenza di slide e trailer; se valido, programma
   * l'avvio del trailer corrente dopo il ritardo configurato.
   *
   * @param ctx Contesto del componente/carousel
   * @returns void
   */
  static provaAvvioInizialeTrailer(ctx: any): void {
    if (!ctx.player) return; // Esco se il player non e' ancora pronto
    if (!ctx.immagini.length) return; // Esco se non ho slide/immagini
    if (!ctx.trailers.length) return; // Esco se non ho trailer disponibili
    CaroselloVideoUtility.avviaTrailerCorrenteDopo(
      ctx,
      ctx.RITARDO_MOSTRA_PLAYER_MS,
    ); // Avvio il trailer della slide corrente dopo il ritardo configurato
  }

  /**
   * Pianifica l'avvio del trailer della slide corrente dopo un certo ritardo.
   *
   * Applica vincoli di stato (solo al top, non in pausa per scroll/blur), annulla avvii pendenti,
   * calcola l'indice reale e il relativo URL trailer, attende la scomparsa delle coperture e
   * poi avvia il caricamento e la riproduzione tramite 'caricaTrailerEAvvia', rispettando un token di coerenza.
   *
   * @param ctx Contesto del componente/carousel
   * @param ms Ritardo in millisecondi prima dell'avvio effettivo
   * @returns void
   */
  static avviaTrailerCorrenteDopo(ctx: any, ms: number): void {
    // Pianifico l'avvio del trailer della slide corrente dopo un certo ritardo
    if (!ctx.player) return; // Esco se il player non e' pronto
    if (!ctx.trailers || ctx.trailers.length === 0) return; // Esco se non ho trailer disponibili

    if (
      !ctx.alTop ||
      ctx.pausaPerScroll ||
      ctx.pausaPerBlur ||
      ctx.pausaPerHover
    ) {
      // Fuori top o in pausa scroll/blur non devo mai avviare video
      ctx.mostraVideo = false; // Mi assicuro che il video resti nascosto
      return;
    }

    CaroselloVideoUtility.fermaAvvioPendete(ctx); // Cancello eventuali avvii gia' schedulati

    const len = ctx.immagini.length; // Leggo quante slide reali ho
    const indiceReale = (ctx.indiceCorrente - 1 + len) % len; // Calcolo l'indice reale 0-based della slide corrente
    const urlTrailer = ctx.trailers[indiceReale] || ''; // Prendo l'url del trailer della slide corrente

    if (!urlTrailer) {
      // Se non c'e' trailer per questa slide, non faccio partire nulla
      ctx.mostraVideo = false; // Tengo nascosto il video
      return;
    }

    const token = ++ctx.numeroSequenzaAvvio; // Genero un token per invalidare avvii precedenti

    ctx.mostraVideo = false; // Tengo nascosto il video finche' non sono pronto a mostrarlo
    CaroselloAudioUtility.sfumaGuadagnoVerso(ctx, 0, 0); // Porto subito il volume a zero (reset immediato)

    try {
      ctx.player.pause();
    } catch {} // Fermo il player in modo safe
    try {
      ctx.player.currentTime(0);
    } catch {} // Resetto il tempo del player in modo safe

    ctx.tentativiTrailer = 0; // Resetto il contatore retry per questo trailer

    ctx.attendiCopertureNonVisibili().then(() => {
      // Aspetto che eventuali coperture/overlay non siano visibili prima di far partire il video
      if (token !== ctx.numeroSequenzaAvvio) return; // Esco se nel frattempo e' stato richiesto un altro avvio

      ctx.timerMostra = setTimeout(
        async () => {
          // Schedulo l'avvio effettivo dopo 'ms'
          ctx.timerMostra = null; // Azzero il riferimento al timer appena scatta

          if (token !== ctx.numeroSequenzaAvvio) return; // Esco se nel frattempo e' cambiata la sequenza

          if (!ctx.alTop || ctx.pausaPerScroll || ctx.pausaPerBlur) {
            // Ricontrollo le condizioni: potrei aver scrollato/blur nel frattempo
            ctx.mostraVideo = false; // Mantengo nascosto il video
            return;
          }

          await CaroselloVideoUtility.caricaTrailerEAvvia(
            ctx,
            urlTrailer,
            token,
          ); // Carico il trailer e lo avvio usando il token di coerenza
        },
        Math.max(0, ms),
      ); // Forzo ms per evitare valori negativi
    });
  }

  /**
   * Riprova ad avviare il trailer corrente in caso di stallo o errore, rispettando token e limiti di tentativi.
   *
   * Verifica che il token corrisponda alla sequenza corrente, che lo stato consenta la riproduzione
   * e che non sia stato superato il massimo numero di tentativi; quindi ricarica e riavvia lo stesso trailer.
   *
   * @param ctx Contesto del componente/carousel
   * @param token Token di coerenza della sequenza di avvio corrente
   * @returns void
   */
  static riprovaTrailerCorrente(ctx: any, token: number): void {
    if (token !== ctx.numeroSequenzaAvvio) return; // Esco se il token non corrisponde alla sequenza corrente
    if (!ctx.alTop || ctx.pausaPerScroll || ctx.pausaPerBlur) return; // Esco se non devo riprodurre video in questo stato
    if (ctx.tentativiTrailer >= ctx.MAX_TENTATIVI_TRAILER) return; // Esco se ho gia' raggiunto il massimo numero di tentativi

    ctx.tentativiTrailer++; // Incremento il contatore di tentativi per questo trailer

    const len = ctx.immagini.length; // Leggo quante slide reali ho
    const indiceReale = (ctx.indiceCorrente - 1 + len) % len; // Calcolo l'indice reale 0-based della slide corrente
    const urlTrailer = ctx.trailers[indiceReale] || ''; // Prendo l'url del trailer della slide corrente
    if (!urlTrailer) return; // Esco se non ho un url valido

    CaroselloVideoUtility.caricaTrailerEAvvia(ctx, urlTrailer, token); // Riprovo caricando e avviando lo stesso trailer con lo stesso token
  }

  /**
   * Carica il trailer nel player e tenta l'avvio gestendo WebAudio e fallback per policy di autoplay.
   *
   * Imposta la sorgente, attende eventi chiave (loadedmetadata e canplay), verifica lo stato,
   * mostra il video quando pronto, inizializza WebAudio e tenta il play con audio; se bloccato,
   * ripiega su avvio mutato con possibilita' di sblocco audio su interazione utente.
   * Se canplay non arriva entro timeout, pianifica un controllo stallo.
   *
   * @param ctx Contesto del componente/carousel
   * @param urlTrailer URL del trailer da caricare
   * @param token Token di coerenza della sequenza di avvio corrente
   * @returns Promise risolta quando il tentativo di avvio e' stato completato
   */
  static async caricaTrailerEAvvia(
    ctx: any,
    urlTrailer: string,
    token: number,
  ): Promise<void> {
    if (!ctx.player) return; // Esco se il player non e' disponibile

    ctx.mostraVideo = false; // Tengo nascosto il video finche' non sono pronto a mostrarlo
    CaroselloAudioUtility.sfumaGuadagnoVerso(ctx, 0, 0); // Porto subito il volume a zero per partire pulito

    try {
      ctx.player.pause();
    } catch {} // Metto in pausa in modo safe prima di cambiare sorgente
    try {
      ctx.player.currentTime(0);
    } catch {} // Resetto il tempo in modo safe prima di cambiare sorgente

    try {
      // Provo a impostare la sorgente e ricaricare il media
      ctx.player.src({ src: urlTrailer, type: 'video/mp4' }); // Imposto il nuovo src del trailer
      try {
        ctx.player.load?.();
      } catch {} // Forzo load se esiste (optional chaining)
      ctx.applicaAttributiVideoReale(); // Riapplico gli attributi sul video reale dopo il cambio sorgente
    } catch {
      // Se src/load falliscono
      return;
    }

    await ctx.attendiEventoPlayer('loadedmetadata', 4000); // Aspetto i metadata (spesso necessari su Firefox)
    if (token !== ctx.numeroSequenzaAvvio) return; // Esco se nel frattempo e' cambiata la sequenza

    try {
      ctx.player.currentTime(0.01);
    } catch {} // Faccio un micro-seek per 'sbloccare' alcuni casi di buffering

    const okCanPlay = await ctx.attendiEventoPlayer('canplay', 6000); // Aspetto canplay con timeout e memorizzo se e' arrivato
    if (token !== ctx.numeroSequenzaAvvio) return; // Esco se nel frattempo e' cambiata la sequenza

    if (!ctx.alTop || ctx.pausaPerScroll || ctx.pausaPerBlur) {
      // Ricontrollo che lo stato consenta la riproduzione
      ctx.mostraVideo = false; // Tengo nascosto il video se non posso riprodurre
      return;
    }

    CaroselloAudioUtility.inizializzaWebAudioSuVideoReale(ctx); // inizializzo o ricollego la catena WebAudio al vero elemento video del player

    try {
      if (ctx.nodoGuadagno && ctx.contestoAudio) {
        const t0 = ctx.contestoAudio.currentTime; // leggo il tempo corrente del contesto audio per schedulare correttamente il gain
        ctx.nodoGuadagno.gain.cancelScheduledValues(t0); // annullo eventuali automazioni del gain ancora pendenti da operazioni precedenti
        ctx.nodoGuadagno.gain.setValueAtTime(0, t0); // imposto subito il guadagno a zero cosi' il trailer parte in silenzio e senza colpi audio
      }
    } catch {} // provo a resettare il gain audio senza interrompere il flusso se qualcosa non e' pronto

    await new Promise((r) => setTimeout(r, 140)); // aspetto un piccolo intervallo per lasciare stabilizzare player, video reale e WebAudio
    if (token !== ctx.numeroSequenzaAvvio) return; // se nel frattempo e' cambiata la sequenza di avvio interrompo questa esecuzione vecchia
    if (!ctx.alTop || ctx.pausaPerScroll || ctx.pausaPerBlur) {
      ctx.mostraVideo = false; // se non sono piu' nelle condizioni corrette tengo il video nascosto
      return; // mi fermo senza proseguire nell'avvio
    }

    ctx.mostraVideo = true; // a questo punto posso rendere visibile il video per la partenza del trailer

    ctx.player.one('playing', () => {
      // mi aggancio una sola volta all'evento playing per completare la fase finale quando il video inizia davvero a suonare
      if (token !== ctx.numeroSequenzaAvvio) return; // se il token non coincide piu' ignoro questo evento vecchio
      if (!ctx.alTop || ctx.pausaPerScroll || ctx.pausaPerBlur) return; // se non sono piu' nelle condizioni corrette ignoro l'evento

      try {
        const el = CaroselloAudioUtility.ottieniElementoVideoRealePubblico(ctx); // recupero il vero elemento video attualmente usato dal player
        if (el && !el.muted) ctx.audioConsentito = true; // segno audio consentito solo se il video sta davvero riproducendo senza mute
      } catch {} // provo a leggere lo stato reale del video senza interrompere il flusso in caso di errore

      try {
        if (ctx.contestoAudio && ctx.contestoAudio.state === 'suspended') {
          ctx.contestoAudio.resume().catch(() => {});
        }
      } catch {} // se il contesto audio e' sospeso provo a riattivarlo mentre il video sta partendo

      CaroselloAudioUtility.sfumaGuadagnoVerso(ctx, 1, ctx.durataFadeAudioMs); // faccio rientrare gradualmente il volume fino al livello pieno
    });

    if (ctx.audioBloccatoDaUtente) {
      CaroselloAudioUtility.avviaMutatoConOpzioneSblocco(ctx, false); // se l'utente ha bloccato l'audio avvio direttamente in mutato senza preparare sblocchi
    } else {
      try {
        CaroselloAudioUtility.impostaMuteReale(ctx, false); // provo a togliere il mute reale prima del play normale con audio
        const p = ctx.player.play(); // chiedo al player di avviare il trailer con audio
        if (p && typeof p.then === 'function') {
          p.catch(() => {
            CaroselloAudioUtility.avviaMutatoConOpzioneSblocco(ctx, true); // se il browser rifiuta il play con audio ripiego su avvio mutato con opzione di sblocco su click
          });
        }
      } catch {
        CaroselloAudioUtility.avviaMutatoConOpzioneSblocco(ctx, true); // se il tentativo con audio lancia errore ripiego subito sull'avvio mutato con sblocco
      }
    }

    if (!okCanPlay) ctx.pianificaControlloStallo(token); // Se canplay non e' arrivato entro timeout, pianifico un controllo stallo
  }

  /**
   * Riavvia il trailer corrente dopo un cambio lingua.
   *
   * Nasconde il video, annulla avvii pendenti, esegue fade-out audio e reset del player,
   * quindi programma nuovamente l'avvio del trailer corrente dopo il ritardo configurato.
   *
   * @param ctx Contesto del componente/carousel
   * @returns void
   */
  static riavviaTrailerCorrenteDopoCambioLingua(ctx: any): void {
    // Riavvio il trailer corrente dopo un cambio lingua (con fade-out e reset)
    if (!ctx.player) return; // Esco se il player non e' pronto
    if (!ctx.trailers || ctx.trailers.length === 0) return; // Esco se non ho trailer disponibili

    ctx.mostraVideo = false; // Nascondo il video durante il riavvio
    CaroselloVideoUtility.fermaAvvioPendete(ctx); // Annullo eventuali avvii pendenti

    CaroselloAudioUtility.sfumaGuadagnoVerso(
      ctx,
      0,
      ctx.durataFadeAudioMs,
    ).finally(() => {
      // Faccio fade-out e poi fermo/resetto prima di ripartire
      try {
        ctx.player.pause();
      } catch {} // Metto in pausa in modo safe
      try {
        ctx.player.currentTime(0);
      } catch {} // Resetto il tempo in modo safe

      CaroselloVideoUtility.avviaTrailerCorrenteDopo(
        ctx,
        ctx.RITARDO_MOSTRA_PLAYER_MS,
      ); // Riparto col trailer corrente dopo il ritardo previsto
    });
  }

  /**
   * Prova ad avviare la riproduzione con audio quando le policy del browser lo consentono.
   *
   * Tenta play senza mute e, se fallisce (Promise reject, eccezioni o player ancora in pausa),
   * ripiega su avvio mutato con opzione di sblocco audio su interazione utente.
   * In caso di successo, marca l'audio come consentito e inizializza WebAudio.
   *
   * @param ctx Contesto del componente/carousel
   * @returns void
   */
  static tentaAutoplayConAudio(ctx: any): void {
    // Provo ad avviare il video con audio (se le policy del browser lo permettono)
    try {
      // Provo la strategia con audio, gestendo eventuali eccezioni
      CaroselloAudioUtility.impostaMuteReale(ctx, false); // Provo a togliere il mute reale prima del play

      const promessa = ctx.player.play(); // Chiedo al player di partire e intercetto l'eventuale Promise
      if (promessa && typeof promessa.then === 'function') {
        // Se play() restituisce una Promise, posso gestire esito/errore
        promessa // Uso la promise dell'autoplay
          .then(() => {
            // Caso in cui l'autoplay con audio e' consentito
            ctx.audioConsentito = true; // Segno che l'audio e' consentito
            CaroselloAudioUtility.inizializzaWebAudioSuVideoReale(ctx); // Inizializzo la catena WebAudio sul video reale
          })
          .catch(() => {
            // Caso in cui l'autoplay con audio e' bloccato
            CaroselloAudioUtility.avviaMutatoConOpzioneSblocco(ctx, true); // Ripiego su avvio mutato mostrando l'opzione di sblocco
          });
      } else {
        // Caso in cui play() non restituisce una Promise (browser/implementazione diversa)
        setTimeout(() => {
          // Rimando a microtask/macrotask per ricontrollare lo stato del player
          try {
            // Provo a verificare se il player e' rimasto in pausa
            if (
              ctx.player &&
              typeof ctx.player.paused === 'function' &&
              ctx.player.paused()
            ) {
              // Se risulta ancora in pausa, considero l'autoplay fallito
              CaroselloAudioUtility.avviaMutatoConOpzioneSblocco(ctx, true); // Ripiego su avvio mutato con opzione di sblocco
            }
          } catch {
            // Se il check fallisce per qualche motivo
            CaroselloAudioUtility.avviaMutatoConOpzioneSblocco(ctx, true); // Ripiego comunque su avvio mutato con opzione di sblocco
          }
        }, 0); // Eseguo appena possibile senza introdurre ritardi percepibili
      }
    } catch {
      // Se qualsiasi parte della strategia con audio lancia eccezione
      CaroselloAudioUtility.avviaMutatoConOpzioneSblocco(ctx, true); // Ripiego su avvio mutato con opzione di sblocco
    }
  }
}
