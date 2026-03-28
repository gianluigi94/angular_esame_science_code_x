// ─── player-state.context.ts ─────────────────────────────────────────────────
// Oggetto di stato condiviso (passato per riferimento) tra il componente e tutti
// gli helper.  Sostituisce i ~20 campi privati sparsi nel componente originale.

export class PlayerStateContext {
  player:          any   = null;

  avvioConsentito        = false;
  playInterno            = false;
  pauseToken             = 0;

  originalPause:   any   = null;
  originalPlay:    any   = null;

  URL_MASTER             = '';
  URL_1080               = '';
  URL_720                = '';
  URL_360                = '';

  doppioAvvioEseguito    = false;

  currentLang: 'en'|'it' =
    localStorage.getItem('lingua_utente') === 'italiano' ? 'it' : 'en';

  infoEpisodio: { stagione: number; episodio: number } | null = null;
  sottotitoli:  { en: string; it: string }               | null = null;
}
