// utility che esegue uno stop dolce immediato del player del carosello, fermando avvii pendenti, sfumando l'audio e poi mettendo in pausa e resettando il video

export class CaroselloStopUtility {
  /**
   * Esegue uno stop dolce immediato del player del carosello.
   * - Prova prima a fermare eventuali avvii trailer pendenti
   * - Se non esiste un player termina subito
   * - Sfuma il guadagno audio fino a zero
   * - Alla fine mette in pausa il player, lo riporta all'inizio e nasconde il video
   *
   * @param contesto any Contesto del carosello da cui leggere player, stato e metodi pubblici.
   * @param durataMs number Durata del fade audio in millisecondi.
   * @returns Promise<void> Promise risolta quando lo stop dolce e' terminato.
   */
  static stopDolceImmediato(contesto: any, durataMs: number): Promise<void> {
    try {
      contesto.fermaAvvioPendete();
    } catch {} // provo a fermare eventuali avvii trailer pendenti senza bloccare il flusso

    if (!contesto.player) return Promise.resolve(); // se non esiste un player attivo non ho nulla da fermare e termino subito

    return contesto
      .sfumaGuadagnoVerso(0, Math.max(0, durataMs || 0)) // porto gradualmente il guadagno audio a zero usando una durata sempre non negativa
      .finally(() => {
        try {
          contesto.player.pause();
        } catch {} // provo a mettere in pausa il player senza interrompere il flusso in caso di errore
        try {
          if (
            contesto.player &&
            typeof contesto.player.readyState === 'function' &&
            contesto.player.readyState() >= 1
          ) {
            contesto.player.currentTime(0);
          }
        } catch {} // se il player e' pronto provo a riportare il video all'inizio
        try {
          contesto.mostraVideo = false;
        } catch {} // provo a nascondere il video dopo lo stop dolce
      });
  }
}
