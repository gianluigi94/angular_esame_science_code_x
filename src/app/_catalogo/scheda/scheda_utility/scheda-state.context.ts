// ─── scheda-state.context.ts ─────────────────────────────────────────────────
// Oggetto di stato condiviso (passato per riferimento) tra il componente e tutti
// gli helper. Nessuna logica: solo campi.

export class SchedaStateContext {
  // ── Contenuto corrente ────────────────────────────────────────────────────
  slugCorrente         = '';
  tipoContenuto:       'film' | 'serie' | null = null;
  idContenuto:         number | null = null;

  // ── Player trailer scheda ─────────────────────────────────────────────────
  playerScheda:        any   = null;
  playerSchedaPronto         = false;
  mostraPlayerSchedaNelDom   = false;
  mostraVideoScheda          = false;
  trailerInRiproduzione      = true;
  avvioTrailerSchedaRichiesto = false;
  durataFadeSchedaMs         = 400;

  // Timer handles
  timerInserisciPlayerSchedaNelDom: any = null;
  timerMostraVideoScheda:           any = null;
  timerResetPlayerScheda:           any = null;

  // ── WebAudio ─────────────────────────────────────────────────────────────
  contestoAudio:       any   = null;
  nodoSorgente:        any   = null;
  nodoGuadagno:        any   = null;
  elementoVideoReale:  HTMLVideoElement | null = null;

  // ── Stato audio utente ────────────────────────────────────────────────────
  audioBloccatoDaUtente = false;
  soloBrowserBlocca     = false;
  handlerSbloccoAudioScheda: any = null;

  // ── Stagioni (solo serie) ─────────────────────────────────────────────────
  stagioneSelezionata: string | null = null;
  stagioni: Array<{ id_stagione: number; numero_stagione: number; numero_episodi: number }> = [];
  serieData: Record<string, Record<string, { titolo: string; descrizione: string; anteprima: string; durata: string }>> = {};
  stagioneCachata = new Set<string>();

  // ── Ciclo di vita ─────────────────────────────────────────────────────────
  distrutto = false;
}
