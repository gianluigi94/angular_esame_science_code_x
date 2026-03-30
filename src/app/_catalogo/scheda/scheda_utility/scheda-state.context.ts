// Oggetto di stato condiviso tra componente e helper della scheda, senza logica.

export class SchedaStateContext {
  slugCorrente = ''; // lo slug del contenuto corrente
  tipoContenuto: 'film' | 'serie' | null = null; // il tipo del contenuto corrente
  idContenuto: number | null = null; // l'id del contenuto corrente

  playerScheda: any = null; // l'istanza del player trailer della scheda
  playerSchedaPronto = false; // segno se il player scheda e' pronto
  mostraPlayerSchedaNelDom = false; // segno se il player deve stare nel DOM
  mostraVideoScheda = false; // segno se il video della scheda deve essere visibile
  trailerInRiproduzione = true; // segno se il trailer e' considerato in riproduzione
  avvioTrailerSchedaRichiesto = false; // segno se e' stato richiesto l'avvio del trailer
  durataFadeSchedaMs = 400; // la durata del fade della scheda

  timerInserisciPlayerSchedaNelDom: any = null; // il timer che inserisce il player nel DOM
  timerMostraVideoScheda: any = null; // il timer che mostra il video scheda
  timerResetPlayerScheda: any = null; // il timer che resetta il player scheda

  contestoAudio: any = null; // l'AudioContext della scheda
  nodoSorgente: any = null; // il nodo sorgente WebAudio
  nodoGuadagno: any = null; // il GainNode WebAudio
  elementoVideoReale: HTMLVideoElement | null = null; // il riferimento al video reale

  audioBloccatoDaUtente = false; // segno se l'audio e' bloccato dall'utente
  soloBrowserBlocca = false; // segno se il blocco audio dipende solo dal browser
  handlerSbloccoAudioScheda: any = null; // il listener di sblocco audio della scheda

  stagioneSelezionata: string | null = null; // la stagione selezionata
  stagioni: Array<{ id_stagione: number; numero_stagione: number; numero_episodi: number }> = []; // la lista delle stagioni
  serieData: Record<string, Record<string, { titolo: string; descrizione: string; anteprima: string; durata: string }>> = {}; // i dati episodi raggruppati per stagione
  stagioneCachata = new Set<string>(); // l'elenco delle stagioni gia' caricate

  distrutto = false; // segno se il contesto e' stato distrutto
}
