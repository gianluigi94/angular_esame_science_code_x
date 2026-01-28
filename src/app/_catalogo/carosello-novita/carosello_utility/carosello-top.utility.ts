// Utility che decide cosa succede al carosello quando l’utente scorre la pagina, passando in modo controllato tra 'in cima' (trailer) e 'non in cima' (autoscroll).

export class CaroselloTopUtility {

  /**
 * Gestisce l'uscita dalla zona 'top' della pagina.
 *
 * Imposta la pausa per scroll, annulla avvii trailer pendenti, invalida la sequenza,
 * nasconde il video, sfuma l'audio a zero e ferma/resetta il player.
 * Infine avvia l'autoscroll per la modalita' 'non in cima'.
 *
 * @param ctx Contesto del componente/carousel
 * @returns void
 */
  static onUscitaDalTop(ctx: any): void {
    if (!ctx.player || ctx.pausaPerScroll) return; // Esco se il player non c'e' o se sono gia' in pausa per scroll

    ctx.pausaPerScroll = true; // Segno che ora sono in pausa per scroll (non devo avviare video)

     if (ctx.pausaPerHover) return;
 if (ctx.stopDolceInCorso) return;
    ctx.fermaAvvioPendete(); // Annullo eventuali avvii pendenti del trailer
    ctx.numeroSequenzaAvvio++; // Invalido eventuali avvii in corso incrementando la sequenza

    ctx.mostraVideo = false; // Nascondo il video quando esco dal top

    ctx.sfumaGuadagnoVerso(0, ctx.durataFadeAudioMs).finally(() => {
      // Faccio fade-out e poi fermo/resetto il player
      try {
        ctx.player.pause();
      } catch {} // Metto in pausa in modo safe
      try {
        ctx.player.currentTime(0);
      } catch {} // Resetto il tempo in modo safe
    });

    if (!ctx.pausaPerHover) ctx.avviaAutoscroll();
  }


/**
 * Gestisce il ritorno alla zona 'top' della pagina.
 *
 * Rimuove la pausa per scroll, ferma l'autoscroll, resetta il trailer all'inizio
 * e programma l'avvio del trailer corrente dopo il ritardo previsto.
 *
 * @param ctx Contesto del componente/carousel
 * @returns void
 */
  static onRitornoAlTop(ctx: any): void {
    // Gestisco il ritorno alla zona 'top' (stop autoscroll e riavvio trailer)
    if (!ctx.player || !ctx.pausaPerScroll) return; // Esco se il player non c'e' o se non ero in pausa per scroll

    ctx.pausaPerScroll = false; // Tolgo lo stato di pausa per scroll (posso tornare a riprodurre video)

    ctx.fermaAutoscroll(); // Stoppo e resetto il timer di autoscroll
     if (ctx.pausaPerHover) return;
 if (ctx.stopDolceInCorso) return;
    try {
      ctx.player.currentTime(0);
    } catch {} // Provo a riportare il trailer all'inizio in modo safe

    ctx.avviaTrailerCorrenteDopo(ctx.RITARDO_MOSTRA_PLAYER_MS); // Avvio il trailer della slide corrente dopo il ritardo previsto
  }


/**
 * Gestisce i cambi di stato legati allo scroll tra 'in cima' e 'non in cima'.
 *
 * Calcola se la pagina e' considerata 'in cima' usando una soglia e,
 * quando lo stato cambia, aggiorna 'alTop' e applica la logica corretta:
 * - uscita dal top: stop trailer e avvio autoscroll
 * - ritorno al top: stop autoscroll e avvio trailer
 *
 * @param ctx Contesto del componente/carousel
 * @returns void
 */
  static gestisciScroll(ctx: any): void {
    const y = window.pageYOffset || document.documentElement.scrollTop || 0; // Leggo la posizione verticale corrente dello scroll
    const inCima = y <= ctx.SCROLL_THRESHOLD; // Decido se considero la pagina 'in cima' usando la soglia

    if (inCima === ctx.alTop) return; // Esco se non e' cambiato lo stato (resto top o resto non-top)

    ctx.alTop = inCima; // Aggiorno lo stato 'alTop' con il nuovo valore

    if (!inCima) {
      // Se sono uscito dalla cima
      CaroselloTopUtility.onUscitaDalTop(ctx); // Applico la logica di uscita dal top
    } else {
      // Se sono tornato in cima..
      CaroselloTopUtility.onRitornoAlTop(ctx); // Applico la logica di ritorno al top
    }
  }
}
