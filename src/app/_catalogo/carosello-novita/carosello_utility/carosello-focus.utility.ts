// Utility che mantiene coerente lo stato del carosello quando la finestra perde/riacquista il focus, evitando riproduzioni o scorrimenti “fuori contesto”.

export class CaroselloFocusUtility {

  /**
 * Gestisce cosa succede quando la finestra perde il focus.
 *
 * Ferma l'autoscroll, annulla avvii trailer pendenti, imposta lo stato di pausa per blur,
 * nasconde il video e sfuma l'audio a zero; al termine del fade mette in pausa il player
 * e riporta il trailer all'inizio.
 *
 * @param ctx Contesto del componente/carousel
 * @returns void
 */
  static gestisciBlurFinestra(ctx: any): void { // Gestisco cosa succede quando la finestra perde il focus
    ctx.fermaAutoscroll(); // Blocco qualsiasi autoscroll e resetto il timer

    if (!ctx.player) return; // Esco se il player non esiste
    if (ctx.pausaPerBlur) return;

    ctx.pausaPerBlur = true; // Segno che sono in pausa per blur

    ctx.fermaAvvioPendete(); // Annullo eventuali avvii trailer pendenti
    ctx.numeroSequenzaAvvio++; // Invalido eventuali avvii in corso incrementando la sequenza

    ctx.mostraVideo = false; // Nascondo il video durante la pausa per blur

    ctx.sfumaGuadagnoVerso(0, ctx.durataFadeAudioMs).finally(() => { // Faccio fade-out audio e poi fermo/resetto il video
      try { ctx.player.pause(); } catch {} // Provo a mettere in pausa senza rompere se il player non e' pronto
      try { ctx.player.currentTime(0); } catch {} // Provo a riportare il video all'inizio senza rompere in caso di errore
    });
  }

  /**
 * Gestisce cosa succede quando la finestra torna in focus.
 *
 * Rimuove lo stato di pausa per blur e:
 * - se non sono in cima alla pagina, riavvia l'autoscroll
 * - se sono in cima e non sono in pausa per scroll, programma l'avvio del trailer corrente
 *
 * @param ctx Contesto del componente/carousel
 * @returns void
 */
  static gestisciFocusFinestra(ctx: any): void { // Gestisco cosa succede quando la finestra torna in focus
    if (!ctx.pausaPerBlur) return; // Esco se non ero in pausa per blur
    ctx.pausaPerBlur = false; // Tolgo lo stato di pausa per blur

    if (!ctx.alTop) { // Se non sono in cima, riparto l'autoscroll
      if (!ctx.pausaPerHover) ctx.avviaAutoscroll() // Riavvio il timer di autoscroll da zero
      return; // Esco per non avviare anche il trailer
    }

    if (ctx.player && !ctx.pausaPerScroll) { // Se sono in cima e non sono in pausa per scroll, posso ripartire col trailer
      ctx.avviaTrailerCorrenteDopo(ctx.RITARDO_MOSTRA_PLAYER_MS); // Avvio il trailer corrente dopo il ritardo previsto
    }
  }

}
