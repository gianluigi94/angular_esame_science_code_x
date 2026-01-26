// Utility che incapsula l’integrazione con il player video, così il carosello può inizializzare e controllare la riproduzione in modo consistente.

import videojs from 'video.js';

export class CaroselloPlayerUtility {

/**
 * Collega la gestione dell'evento di fine trailer del player.
 *
 * Rimuove eventuali listener precedenti per evitare duplicati e, quando il trailer termina:
 * - nasconde il video
 * - annulla avvii pendenti
 * - sfuma l'audio a zero
 * - mette in pausa e resetta il player
 * - avanza alla slide successiva
 *
 * @param ctx Contesto del componente/carousel
 * @returns void
 */
  static collegaFineTrailer(ctx: any): void {
    try {
      // Provo a pulire eventuali listener precedenti senza rischiare crash
      if (!ctx.player) return; // Esco se il player non e' disponibile
      ctx.player.off('ended'); // Rimuovo il listener 'ended' per evitare duplicati
    } catch {}

    try {
      // Provo ad agganciare il nuovo listener 'ended' in modo safe
      ctx.player.on('ended', () => {
        // Reagisco quando il trailer arriva alla fine
        ctx.mostraVideo = false; // Nascondo il video appena finisce
        ctx.fermaAvvioPendete(); // Annullo eventuali avvii pendenti schedulati

        ctx.sfumaGuadagnoVerso(0, ctx.durataFadeAudioMs).finally(() => {
          // Faccio fade-out e poi resetto il player
          try {
            ctx.player.pause();
          } catch {} // Metto in pausa in modo safe
          try {
            ctx.player.currentTime(0);
          } catch {} // Riporto a inizio in modo safe

          ctx.vaiAvantiDaFineTrailer(); // Avanzo alla slide successiva quando il trailer e' terminato
        });
      });
    } catch {}
  }

  /**
 * Inizializza il player video quando il riferimento DOM e' disponibile e non e' gia' stato inizializzato.
 *
 * Crea l'istanza video.js, forza autoplay disabilitato, mantiene il video nascosto
 * finche' non viene avviato esplicitamente e collega gli eventi principali:
 * - techready e loadstart per riallineare il video reale e WebAudio
 * - stalled, waiting ed error per pianificare controlli di stallo e retry soft
 * Infine collega la gestione di fine trailer e prova l'avvio iniziale.
 *
 * @param ctx Contesto del componente/carousel
 * @returns void
 */
  static inizializzaPlayerSePronto(ctx: any): void {
    if (ctx.playerInizializzato) return; // Esco se ho gia' inizializzato il player
    if (!ctx.riproduttore || !ctx.riproduttore.nativeElement) return; // Esco se il riferimento al DOM non e' ancora pronto

    ctx.playerInizializzato = true; // Segno che l'inizializzazione e' stata fatta per evitare doppioni

    ctx.player = videojs(ctx.riproduttore.nativeElement, {
      // Creo l'istanza video.js sul nativeElement
      autoplay: false,
      muted: false,
      controls: false,
      loop: false,
      preload: 'auto',
      playsinline: true,
    });

    try {
      ctx.player.autoplay && ctx.player.autoplay(false);
    } catch {} // Forzo autoplay false

    ctx.mostraVideo = false; // Tengo nascosto il video finche' non lo avvio esplicitamente

    ctx.player.on('techready', () => ctx.verificaRicollegamentoVideo()); // Quando la tech e' pronta, verifico se e' cambiato il video reale

    ctx.player.on('loadstart', () => {
      // All'inizio del caricamento del media, riallineo riferimenti e resetto retry
      ctx.verificaRicollegamentoVideo(); // Controllo se il tag <video-js> reale e' cambiato e, se si', ricollego WebAudio
      ctx.tentativiTrailer = 0; // Resetto i tentativi di retry per il trailer corrente
    });

    ctx.player.on('stalled', () =>
      ctx.pianificaControlloStallo(ctx.numeroSequenzaAvvio)
    ); // Se va in stalled, pianifico un controllo/riprova soft
    ctx.player.on('waiting', () =>
      ctx.pianificaControlloStallo(ctx.numeroSequenzaAvvio)
    ); // Se resta in waiting, pianifico un controllo/riprova soft
    ctx.player.on('error', () =>
      ctx.pianificaControlloStallo(ctx.numeroSequenzaAvvio)
    ); // Se c'e' errore, pianifico un controllo/riprova soft

    CaroselloPlayerUtility.collegaFineTrailer(ctx); // Collego la gestione di fine trailer
    ctx.provaAvvioInizialeTrailer(); // Provo ad avviare il trailer iniziale se le condizioni sono pronte
  }

/**
 * Attende un singolo evento del player con timeout e ritorna se l'evento e' arrivato in tempo.
 *
 * Registra un listener one-shot e risolve:
 * - true se l'evento arriva entro il timeout
 * - false se scade il timeout o se il player non e' disponibile
 *
 * @param ctx Contesto del componente/carousel
 * @param evento Nome dell'evento del player da attendere
 * @param timeoutMs Tempo massimo di attesa in millisecondi
 * @returns Promise che risolve a true se l'evento arriva entro il timeout, false altrimenti
 */
  static attendiEventoPlayer(
    ctx: any,
    evento: string,
    timeoutMs: number
  ): Promise<boolean> {
    // Attendo un singolo evento del player con timeout e ritorno se e' arrivato
    return new Promise((resolve) => {
      // Ritorno una promise che risolve true/false in base all'esito
      if (!ctx.player) return resolve(false); // Se non ho player, non posso attendere eventi

      let finito = false; // Uso un flag per evitare risoluzioni multiple

      const onEv = () => stop(true); // Definisco l'handler dell'evento che conclude con successo

      const stop = (ok: boolean) => {
        // Definisco la chiusura unica che pulisce e risolve
        if (finito) return; // Evito doppie chiusure
        finito = true; // Segno che ho finito
        try {
          ctx.player.off(evento, onEv);
        } catch {} // Rimuovo il listener in modo safe
        resolve(ok); // Risolvo con l'esito passato
      };

      try {
        ctx.player.one(evento, onEv);
      } catch {
        return resolve(false);
      } // Aggancio l'evento one-shot o fallisco subito se non posso

      setTimeout(() => stop(false), Math.max(0, timeoutMs)); // Faccio scadere il timeout e risolvo false se l'evento non arriva
    });
  }

  /**
 * Pianifica un controllo ritardato per gestire stall, waiting o error del player con un retry soft.
 *
 * Dopo un breve ritardo verifica:
 * - che la sequenza sia ancora valida tramite token
 * - che il player esista e lo stato consenta la riproduzione (in cima, non in pausa)
 * Se rileva errore o probabile blocco (readyState basso mentre risulta in riproduzione),
 * attiva il retry del trailer corrente.
 *
 * @param ctx Contesto del componente/carousel
 * @param token Token di coerenza della sequenza di avvio corrente
 * @returns void
 */
  static pianificaControlloStallo(ctx: any, token: number): void {
    setTimeout(() => {
      // Rimando il controllo per dare tempo al player di riprendersi da solo
      if (token !== ctx.numeroSequenzaAvvio) return; // Esco se nel frattempo e' cambiata la sequenza di avvio
      if (!ctx.player) return; // Esco se il player non e' disponibile

      if (!ctx.alTop || ctx.pausaPerScroll || ctx.pausaPerBlur) return; // Esco se non devo riprodurre video in questo stato

      try {
        // Provo a leggere stato/errore del player senza far fallire
        const err = ctx.player.error && ctx.player.error(); // Leggo l'eventuale errore corrente del player
        if (err) {
          // Se c'e' un errore, faccio subito retry del trailer
          ctx.riprovaTrailerCorrente(token); // Riprovo il trailer corrente usando il token di coerenza
          return; // Esco dopo il retry
        }

        const rs =
          typeof ctx.player.readyState === 'function'
            ? ctx.player.readyState()
            : 0; // Leggo readyState se disponibile
        const paused =
          typeof ctx.player.paused === 'function' ? ctx.player.paused() : true; // Leggo se e' in pausa (fallback true)

        if (!paused && rs <= 2) {
          // Se sta 'suonando' ma readyState e' basso, e' probabile che sia bloccato
          ctx.riprovaTrailerCorrente(token); // Faccio un retry soft del trailer corrente
        }
      } catch {} // Ignoro errori di accesso alle API del player
    }, 2500); // Aspetto prima di considerarlo uno stallo da gestire
  }
}
