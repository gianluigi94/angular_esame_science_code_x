// Oggetto di stato condiviso passato per riferimento tra componente e helper del player.

export class PlayerStateContext {
  player: any = null; // istanza corrente del player

  avvioConsentito = false; // se l'avvio logico del player e' consentito
  playInterno = false; // se play o pausa stanno avvenendo come operazione interna controllata
  pauseToken = 0; // token usato per invalidare pause o flussi correlati

  originalPause: any = null; // riferimento alla pause originale del player
  originalPlay: any = null; // riferimento alla play originale del player

  URL_MASTER = ''; // URL master dello stream
  URL_1080 = ''; // URL della qualita' 1080
  URL_720 = ''; // URL della qualita' 720
  URL_360 = ''; // URL della qualita' 360

  doppioAvvioEseguito = false; // se la sequenza di doppio avvio e' gia' stata eseguita

  currentLang: 'en' | 'it' =
    localStorage.getItem('lingua_utente') === 'italiano' ? 'it' : 'en'; // lingua corrente iniziale del player

  infoEpisodio: { stagione: number; episodio: number } | null = null; // info correnti di stagione ed episodio
  sottotitoli: { en: string; it: string } | null = null; // URL correnti dei sottotitoli inglese e italiano
}
