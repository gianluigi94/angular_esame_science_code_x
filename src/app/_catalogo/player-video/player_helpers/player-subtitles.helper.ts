// Helper che gestisce le tracce dei sottotitoli del player, inclusi aggiornamento tracce, patch dei VTT e pulizia dei blob URL.

import { PlayerStateContext } from '../player_utility/player-state.context';
import { PlayerUiHelper } from './player-ui.helper';

export class PlayerSubtitlesHelper {
  private blobUrls: string[] = []; // blob URL temporanei dei VTT patchati

  constructor(
    private ctx: PlayerStateContext,
    private ui: PlayerUiHelper,
  ) {}

  /**
   * Aggiorna le tracce sottotitoli del player.
   * - Pulisce gli eventuali blob URL creati in precedenza
   * - Rimuove le remote text tracks gia' presenti
   * - Genera le sorgenti VTT patchate per inglese e italiano
   * - Aggiunge le nuove tracce sottotitoli al player
   * - Aggiorna poco dopo le label del menu UI
   *
   * @returns Promise<void>
   */
  async aggiornaSottotitoli(): Promise<void> {
    const { player, sottotitoli } = this.ctx; // recupero dal contesto il player e la configurazione dei sottotitoli
    if (!player || !sottotitoli) return; // se mancano player o sottotitoli esco subito

    try {
      this.blobUrls.forEach((u) => URL.revokeObjectURL(u)); // rilascio tutti i blob URL creati in precedenza
      this.blobUrls = []; // azzero l'elenco dei blob URL attivi

      const tracce = player.remoteTextTracks?.(); // recupero le remote text tracks attualmente presenti sul player
      if (tracce) {
        const da_rimuovere: any[] = []; // preparo l'elenco delle tracce da rimuovere
        for (let i = 0; i < tracce.length; i++) da_rimuovere.push(tracce[i]); // raccolgo tutte le tracce correnti in un array separato
        da_rimuovere.forEach((t) => player.removeRemoteTextTrack?.(t)); // rimuovo una a una tutte le tracce correnti dal player
      }

      const [srcEn, srcIt] = await Promise.all([
        this.patchVtt(sottotitoli.en),
        this.patchVtt(sottotitoli.it),
      ]); // preparo in parallelo le sorgenti VTT patchate per inglese e italiano

      const lang = localStorage.getItem('lingua_utente') === 'italiano' ? 'it' : 'en'; // ricavo la lingua utente per decidere le label localizzate

      player.addRemoteTextTrack?.(
        {
          kind: 'subtitles',
          src: srcEn,
          srclang: 'en',
          label: lang === 'it' ? 'Inglese' : 'English',
        },
        false,
      ); // aggiungo la traccia sottotitoli inglese con label localizzata

      player.addRemoteTextTrack?.(
        {
          kind: 'subtitles',
          src: srcIt,
          srclang: 'it',
          label: lang === 'it' ? 'Italiano' : 'Italian',
        },
        false,
      ); // aggiungo la traccia sottotitoli italiana con label localizzata

      setTimeout(() => this.ui.updateMenuLabels(), 100); // poco dopo aggiorno le label del menu UI del player
    } catch {} // ignoro eventuali errori di aggiornamento sottotitoli
  }

  /**
   * Scarica e patcha un file VTT.
   * - Prova a leggere il contenuto testuale del VTT remoto
   * - Se disponibili, sostituisce nei primi caratteri i riferimenti testuali a stagione ed episodio
   * - Crea un Blob VTT patchato
   * - Genera e memorizza un blob URL temporaneo
   * - In caso di errore restituisce l'URL originale
   *
   * @param url URL del file VTT da patchare.
   * @returns Promise<string> Blob URL del VTT patchato oppure URL originale in caso di errore.
   */
  private async patchVtt(url: string): Promise<string> {
    try {
      const testo = await fetch(url).then((r) => r.text()); // scarico il contenuto testuale del file VTT
      let patched = testo; // preparo il testo finale inizialmente uguale all'originale

      const info = this.ctx.infoEpisodio; // recupero dal contesto le info episodio se disponibili
      if (info) {
        const { stagione, episodio } = info; // estraggo stagione ed episodio correnti
        const numWords = '(?:[1-5]|uno|due|tre|quattro|cinque|one|two|three|four|five)'; // regex per i numeri testuali o numerici da sostituire
        const testa = testo.substring(0, 200); // tengo separata la testa iniziale del file
        const coda = testo.substring(200); // tengo separata la parte restante del file
        patched =
          testa
            .replace(new RegExp(`(stagione|season)\\s+${numWords}`, 'gi'), (_m, kw) => `${kw} ${stagione}`)
            .replace(new RegExp(`(episodio|episode)\\s+${numWords}`, 'gi'), (_m, kw) => `${kw} ${episodio}`) +
          coda; // nella testa sostituisco stagione ed episodio con i valori reali e poi riattacco la coda
      }

      const blob = new Blob([patched], { type: 'text/vtt' }); // creo un blob VTT a partire dal testo patchato
      const blobUrl = URL.createObjectURL(blob); // genero un blob URL temporaneo per il VTT patchato
      this.blobUrls.push(blobUrl); // salvo il blob URL per poterlo rilasciare in seguito
      return blobUrl; // restituisco il blob URL del VTT patchato
    } catch {
      return url; // se qualcosa fallisce restituisco l'URL originale non patchato
    }
  }

  /**
   * Esegue la pulizia finale dei blob URL creati per i sottotitoli.
   *
   * @returns void
   */
  destroy(): void {
    this.blobUrls.forEach((u) => URL.revokeObjectURL(u)); // rilascio tutti i blob URL ancora presenti
    this.blobUrls = []; // azzero l'elenco dei blob URL
  }
}
