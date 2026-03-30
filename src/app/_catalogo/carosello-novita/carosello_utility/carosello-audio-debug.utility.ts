export class CaroselloAudioDebugUtility {
  /**
   * Intercetta il tipo di blocco audio attualmente presente nel contesto del carosello.
   * - Se l'audio e' stato bloccato dall'utente segnala quel caso
   * - Altrimenti controlla se il video reale risulta mutato dal browser
   * - Se nessuno dei due casi e' presente segnala che l'audio non e' bloccato
   *
   * @param contesto any Contesto del carosello da cui leggere stato audio, video reale e servizio globale audio.
   * @returns void
   */
  static intercettaTipoBloccoAudio(contesto: any): void {
    if (contesto.audioBloccatoDaUtente) {
      // controllo per prima cosa se il blocco audio dipende da una scelta esplicita dell'utente
      console.log('audio bloccato da utente'); // scrivo in console che il blocco audio e' stato imposto dall'utente
      try {
        contesto.audioGlobaleService.setSoloBrowserBlocca(false);
      } catch {} // provo ad aggiornare il servizio globale segnando che non si tratta di un blocco del browser
      return; // esco subito perche' ho gia' identificato il tipo di blocco
    }

    let mutato = false; // preparo un flag che mi dira' se il video reale risulta mutato
    try {
      const el = contesto.ottieniElementoVideoReale(); // provo a recuperare il vero elemento video collegato al player
      mutato = !!el && !!el.muted; // se l'elemento esiste leggo il suo stato muted e lo trasformo in booleano sicuro
    } catch {} // se non riesco a leggere il video reale lascio il flag a false

    if (mutato) {
      // entro qui se il video reale risulta mutato
      console.log('audio bloccato dal brawser'); // scrivo in console che il blocco audio sembra imposto dal browser
      try {
        contesto.audioGlobaleService.setSoloBrowserBlocca(true);
      } catch {} // provo ad aggiornare il servizio globale segnando che il blocco dipende dal browser
      return; // esco subito perche' ho gia' identificato il tipo di blocco
    }

    console.log('audio non bloccato'); // se non ho trovato blocchi segnalo in console che l'audio non risulta bloccato
    try {
      contesto.audioGlobaleService.setSoloBrowserBlocca(false);
    } catch {} // provo ad aggiornare il servizio globale segnando che non c'e' un blocco browser attivo
  }
}
