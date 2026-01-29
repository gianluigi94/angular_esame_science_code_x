// Utility che rende 'affidabile' la gestione dell’audio del carosello, incapsulando le limitazioni dei browser.

export class CaroselloAudioUtility {
  /**
 * Esegue una sfumatura del guadagno WebAudio verso un valore target
 * utilizzando il GainNode e una durata espressa in millisecondi.
 *
 * @param ctx Contesto del carosello
 * @param target Valore finale del guadagno
 * @param durataMs Durata della sfumatura in millisecondi
 * @returns Promise risolta al termine della sfumatura
 */
  static sfumaGuadagnoVerso( ctx: any, target: number,  durataMs: number ): Promise<void> {
    return new Promise((resolve) => {
      // Incapsulo la sfumatura in una Promise
      try {
        // Provo a usare WebAudio se disponibile
        if (!ctx.contestoAudio || !ctx.nodoGuadagno) {  // Se non ho contesto o nodo guadagno, non posso sfumare
          return resolve(); // Risolvo subito senza fare nulla
        }

        const durataSec = Math.max(0, (durataMs || 0) / 1000); // Converto i ms in secondi
        const t0 = ctx.contestoAudio.currentTime; // Leggo il tempo corrente dell'AudioContext

        try {
          ctx.nodoGuadagno.gain.cancelScheduledValues(t0);
        } catch {} // Cancello eventuali automazioni precedenti
        try {
          ctx.nodoGuadagno.gain.setValueAtTime(
            ctx.nodoGuadagno.gain.value ?? 0,
            t0
          );
        } catch {} // Metto un valore base al tempo corrente
        try {
          ctx.nodoGuadagno.gain.linearRampToValueAtTime(target, t0 + durataSec);
        } catch {} // Rampo linearmente verso il target

        if (durataSec === 0) return resolve(); // Se e' istantaneo, posso risolvere subito
        setTimeout(resolve, Math.max(0, durataMs)); // Risolvo quando la durata e' trascorsa
      } catch {
        // Se WebAudio fallisce, non blocco l'app
        resolve(); // Risolvo comunque
      }
    });
  }

  /**
 * Inizializza il sistema WebAudio collegandolo
 * all'elemento video reale del player.
 *
 * @param ctx Contesto del carosello
 * @returns void
 */
  static inizializzaWebAudioSuVideoReale(ctx: any): void {
    try {
      // Avvolgo in try/catch per non rompere su browser/permessi
      const elVideo = CaroselloAudioUtility.ottieniElementoVideoReale(ctx); // Recupero il tag video reale dal player/DOM
      if (!elVideo) return; // Esco se non trovo un video reale

      CaroselloAudioUtility.collegaWebAudioAlVideo(ctx, elVideo); // Collego WebAudio al video (se non gia' collegato)
    } catch {} // Ignoro errori per non bloccare la riproduzione
  }

/**
 * Imposta o rimuove il mute direttamente
 * sul tag video reale del player.
 *
 * @param ctx Contesto del carosello
 * @param mute Indica se attivare o disattivare il mute
 * @returns void
 */
  static impostaMuteReale(ctx: any, mute: boolean): void {  // Imposto il mute sul tag video reale
    try {
      // Provo in modo safe
      const elVideo = CaroselloAudioUtility.ottieniElementoVideoReale(ctx); // Recupero il video reale
      if (!elVideo) return; // Esco se non trovato
      elVideo.muted = !!mute; // Imposto lo stato muted reale
    } catch {} // Ignoro errori
  }

/**
 * Avvia la riproduzione in modalità muta e,
 * se richiesto, prepara lo sblocco audio su interazione utente.
 *
 * @param ctx Contesto del carosello
 * @param consentiSblocco Abilita lo sblocco audio su interazione
 * @returns void
 */
  static avviaMutatoConOpzioneSblocco( ctx: any, consentiSblocco: boolean ): void {// Ripiego su play mutato e preparo (se richiesto) lo sblocco audio su interazione
    try {
      // Provo in modo safe
      CaroselloAudioUtility.impostaMuteReale(ctx, true); // Attivo il mute reale prima di partire
    } catch {} // Ignoro errori

    try {
      // Provo ad avviare la riproduzione
      const p = ctx.player?.play?.(); // Chiamo play sul player
      if (p && typeof p.then === 'function') {
        // Se play ritorna una Promise, posso agganciare catch senza bloccare
        p.catch(() => {}); // Non faccio nulla: lo scopo qui e' solo tentare mutato
      }
    } catch {} // Ignoro errori di play

    if (consentiSblocco) {      // Se mi e' consentito preparare lo sblocco audio
      CaroselloAudioUtility.preparaSbloccoAudioSuInterazione(ctx); // Preparo L'azione di sblocco
    }
  }

/**
 * Prepara un listener che tenta di sbloccare l'audio
 * alla prima interazione valida dell'utente.
 *
 * @param ctx Contesto del carosello
 * @returns void
 */
  static preparaSbloccoAudioSuInterazione(ctx: any): void {
    if (ctx.audioBloccatoDaUtente) return;
    if (ctx.handlerSbloccoAudio) return; // Esco se ho gia' un azione

    const handler = () => {
  // Definisco l'handler che prova lo sblocco
  CaroselloAudioUtility.rimuoviAscoltoSbloccoAudio(ctx); // Rimuovo subito i listener per non ripetere tentativi

  ctx.audioConsentito = true; // Considero l'audio 'consentito' dopo un click valido

  // NON spengo subito il video: in hover mi serve mantenerlo visibile
  const sonoInHover = !!ctx.pausaPerHover;

  try {
    // Provo a fermare avvii pendenti prima del riavvio
    ctx.fermaAvvioPendete(); // Annullo eventuali avvii trailer pendenti (e invalido eventuali sequenze vecchie)
  } catch {}

  try {
    // Provo a fare resume del contesto audio se sospeso
    if (ctx.contestoAudio && ctx.contestoAudio.state === 'suspended') {
      // Controllo se l'AudioContext e' sospeso
      ctx.contestoAudio.resume().catch(() => {}); // Provo resume senza bloccare
    }
  } catch {} // Ignoro errori

  try {
    // Provo a impostare subito il gain a 0 per ripartire pulito
    CaroselloAudioUtility.sfumaGuadagnoVerso(ctx, 0, 0); // Porto il guadagno a zero in modo immediato
  } catch {} // Ignoro errori

  try {
    // Provo a fermare e resettare il player prima di riavviare (REWIND SEMPRE)
    try { ctx.player?.pause?.(); } catch {}
    try { ctx.player?.currentTime?.(0); } catch {}
  } catch {} // Ignoro errori

  try {
    // Provo a togliere il mute reale prima del riavvio
    CaroselloAudioUtility.impostaMuteReale(ctx, false); // Tolgo il mute reale
  } catch {} // Ignoro errori

  if (sonoInHover) {
       // CASO HOVER: nascondo il player per evitare "nero", e rimetto la cover mentre riavvio
    try { ctx.mostraVideo = false; } catch {}
    try { ctx.mostraImmagineHover = true; } catch {}
    try { ctx.inizioImmagineHoverMs = Date.now(); } catch {}

    try {
      // riavvio il trailer hover da 0, ora con audio
      ctx.preparaTrailerHoverDopoImmaginePronta();
    } catch {}

    return;
  }

  // CASO NORMALE: comportamento attuale
  ctx.mostraVideo = false; // Nascondo il video mentre faccio reset e riavvio con audio

  try {
    // Riavvio il trailer corrente ora che ho un click valido (gesture utente)
    ctx.avviaTrailerCorrenteDopo(0); // Riavvio subito il trailer corrente con audio (se le condizioni lo consentono)
  } catch {} // Ignoro errori per non bloccare
};

    ctx.handlerSbloccoAudio = handler; // Salvo il riferimento per poter rimuovere dopo

    window.addEventListener('click', handler, {
      once: true,
      passive: true,
      capture: true,
    }); // Aggancio solo su click (unico evento valido)
  }

 /**
 * Rimuove eventuali listener registrati
 * per lo sblocco audio su interazione utente.
 *
 * @param ctx Contesto del carosello
 * @returns void
 */
  static rimuoviAscoltoSbloccoAudio(ctx: any): void {
    // Rimuovo eventuali listener di sblocco audio registrati
    const h = ctx.handlerSbloccoAudio; // Leggo l'handler salvato
    if (!h) return; // Esco se non c'e' nulla da rimuovere

    try {
      window.removeEventListener('click', h, true);
    } catch {} // Rimuovo listener click (capture)

    ctx.handlerSbloccoAudio = null; // Azzero il riferimento per consentire nuovi agganci
  }

/**
 * Restituisce pubblicamente l'elemento video reale attualmente usato dal player.
 *
 * @param ctx Contesto del carosello
 * @returns Elemento video reale oppure null se non presente
 */
  static ottieniElementoVideoRealePubblico(ctx: any): HTMLVideoElement | null {
    // Trovo e ritorno l'elemento <video> reale dentro il player
    return CaroselloAudioUtility.ottieniElementoVideoReale(ctx); // Delego all'helper interno
  }

/**
 * Collega pubblicamente un elemento video reale al sistema WebAudio
 * creando o riutilizzando i nodi necessari (sorgente e GainNode).
 *
 * @param ctx Contesto del carosello
 * @param elVideo Elemento video reale da collegare
 * @returns void
 */
  static collegaWebAudioAlVideoPubblico(ctx: any, elVideo: any): void {
    // Collego l'elemento video al WebAudio (con GainNode per fade)
    if (!elVideo) return; // Esco se non ho un elemento video valido
    CaroselloAudioUtility.collegaWebAudioAlVideo(
      ctx,
      elVideo as HTMLVideoElement
    ); // Delego all'helper interno
  }

/**
 * Verifica se il player ha sostituito il tag video reale e, se necessario,
 * ricollega correttamente WebAudio al nuovo elemento.
 *
 * @param ctx Contesto del carosello
 * @returns void
 */
  static verificaRicollegamentoVideo(ctx: any): void {
    // Verifico se il player ha sostituito il tag <video> e, se si', ricollego il WebAudio
    const el = CaroselloAudioUtility.ottieniElementoVideoReale(ctx); // Recupero il video reale attuale dal DOM
    if (el && el !== ctx.elementoVideoReale) {
      // Se c'e' un video e non e' quello gia' collegato
      CaroselloAudioUtility.applicaAttributiVideoReale(ctx); // Riapplico gli attributi necessari sul nuovo video reale
      CaroselloAudioUtility.collegaWebAudioAlVideo(ctx, el); // Ricollego WebAudio al nuovo elemento video
    }
  }


/**
 * Applica attributi necessari direttamente sul tag video reale del player
 * per garantire compatibilita' e uso con WebAudio.
 *
 * @param ctx Contesto del carosello
 * @returns void
 */
  static applicaAttributiVideoReale(ctx: any): void {
    // Applico attributi necessari direttamente sul tag <video> reale del player
    try {
      // Provo ad applicare attributi senza far fallire il flusso
      const el = CaroselloAudioUtility.ottieniElementoVideoReale(ctx); // Recupero l'elemento <video> reale dal DOM del player
      if (!el) return; // Esco se non ho trovato il video reale
      el.setAttribute('crossorigin', 'anonymous'); // Imposto cors per permettere uso con WebAudio/canvas quando serve
      el.setAttribute('playsinline', ''); // Forzo la riproduzione inline su mobile (evito fullscreen automatico)
    } catch {} // Ignoro errori per non bloccare
  }


 /**
 * Recupera internamente il tag video reale dal DOM del player.
 *
 * @param ctx Contesto del carosello
 * @returns Elemento HTMLVideoElement trovato oppure null se non disponibile
 */
  private static ottieniElementoVideoReale(ctx: any): HTMLVideoElement | null {
    // Recupero il tag <video> reale dal player/DOM
    try {
      // Provo a navigare il DOM del player in modo safe
      if (!ctx.player || !ctx.player.el) return null; // Esco se il player non e' pronto o non espone el()
      const root = ctx.player.el() as HTMLElement; // Prendo il nodo root del player
      const elVideo = root.querySelector('video') as HTMLVideoElement | null; // Cerco il primo tag video dentro il player
      return elVideo || null; // Ritorno il video se trovato, altrimenti null
    } catch {
      // Se qualcosa fallisce
      return null; // Ritorno null come fallback sicuro
    }
  }


/**
 * Collega internamente l'elemento video reale al grafo WebAudio (sorgente + GainNode).
 *
 * Disconnette eventuali nodi precedenti, crea AudioContext se mancante e collega:
 * sorgente -> gain -> destinazione.
 *
 * @param ctx Contesto del carosello
 * @param elVideo Elemento video reale da collegare
 * @returns void
 */
  private static collegaWebAudioAlVideo(
    ctx: any,
    elVideo: HTMLVideoElement
  ): void {
    // Collego l'elemento video al WebAudio (con GainNode per fade)
    if (!elVideo) return; // Esco se non ho un elemento video valido
    if (
      ctx.elementoVideoReale === elVideo &&
      ctx.nodoSorgente &&
      ctx.nodoGuadagno
    )
      return; // Esco se sono gia' collegato a questo video e i nodi esistono

    try {
      // Provo a creare/ricreare il grafo audio in modo safe
      CaroselloAudioUtility.applicaAttributiVideoReale(ctx); // Applico gli attributi necessari sul video reale (autoplay, playsinline, ecc.)

      if (ctx.nodoSorgente) {
        // Se avevo gia' una sorgente, la disconnetto
        try {
          ctx.nodoSorgente.disconnect();
        } catch {} // Disconnetto senza far fallire se il nodo e' in stato strano
      }
      if (ctx.nodoGuadagno) {
        // Se avevo gia' un GainNode, lo disconnetto
        try {
          ctx.nodoGuadagno.disconnect();
        } catch {} // Disconnetto senza far fallire se il nodo e' in stato strano
      }

      if (!ctx.contestoAudio) {
        // Se non ho ancora un AudioContext
        const Ctx = window.AudioContext || (window as any).webkitAudioContext; // Prendo AudioContext cross-browser
        if (!Ctx) return; // Esco se il browser non supporta AudioContext
        ctx.contestoAudio = new Ctx(); // Creo il contesto audio
      }

      ctx.elementoVideoReale = elVideo; // Salvo il riferimento al video reale attuale
      ctx.nodoSorgente = ctx.contestoAudio.createMediaElementSource(
        ctx.elementoVideoReale
      ); // Creo una sorgente WebAudio dal media element
      ctx.nodoGuadagno = ctx.contestoAudio.createGain(); // Creo un GainNode per controllare il volume e fare fade
      try {
        ctx.nodoGuadagno.gain.setValueAtTime(1, ctx.contestoAudio.currentTime);
      } catch {} // Inizializzo il guadagno a 1 (volume pieno)

      ctx.nodoSorgente
        .connect(ctx.nodoGuadagno)
        .connect(ctx.contestoAudio.destination); // Collego sorgente -> gain -> uscita audio
    } catch {} // Ignoro errori per non bloccare
  }
}
