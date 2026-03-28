// ─── player-subtitles.helper.ts ──────────────────────────────────────────────
// Gestisce le tracce di sottotitoli (aggiunta, patch VTT, pulizia blob URL).
// Estratto da player-video.component.ts: aggiornaSottotitoli(), patchVtt().

import { PlayerStateContext } from '../player_utility/player-state.context';
import { PlayerUiHelper }     from './player-ui.helper';

export class PlayerSubtitlesHelper {

  private blobUrls: string[] = [];

  constructor(
    private ctx: PlayerStateContext,
    private ui:  PlayerUiHelper,
  ) {}

  // ── Estratto da aggiornaSottotitoli() ─────────────────────────────────────
  async aggiornaSottotitoli(): Promise<void> {
    const { player, sottotitoli } = this.ctx;
    if (!player || !sottotitoli) return;
    try {
      this.blobUrls.forEach(u => URL.revokeObjectURL(u));
      this.blobUrls = [];

      const tracce = player.remoteTextTracks?.();
      if (tracce) {
        const da_rimuovere: any[] = [];
        for (let i = 0; i < tracce.length; i++) da_rimuovere.push(tracce[i]);
        da_rimuovere.forEach(t => player.removeRemoteTextTrack?.(t));
      }

      const [srcEn, srcIt] = await Promise.all([
        this.patchVtt(sottotitoli.en),
        this.patchVtt(sottotitoli.it),
      ]);

      const lang = localStorage.getItem('lingua_utente') === 'italiano' ? 'it' : 'en';

      player.addRemoteTextTrack?.({
        kind: 'subtitles', src: srcEn, srclang: 'en',
        label: lang === 'it' ? 'Inglese' : 'English',
      }, false);

      player.addRemoteTextTrack?.({
        kind: 'subtitles', src: srcIt, srclang: 'it',
        label: lang === 'it' ? 'Italiano' : 'Italian',
      }, false);

      setTimeout(() => this.ui.updateMenuLabels(), 100);
    } catch {}
  }

  // ── Estratto da patchVtt() ────────────────────────────────────────────────
  private async patchVtt(url: string): Promise<string> {
    try {
      const testo = await fetch(url).then(r => r.text());
      let patched = testo;

      const info = this.ctx.infoEpisodio;
      if (info) {
        const { stagione, episodio } = info;
        const numWords = '(?:[1-5]|uno|due|tre|quattro|cinque|one|two|three|four|five)';
        const testa    = testo.substring(0, 200);
        const coda     = testo.substring(200);
        patched =
          testa
            .replace(new RegExp(`(stagione|season)\\s+${numWords}`,  'gi'), (_m, kw) => `${kw} ${stagione}`)
            .replace(new RegExp(`(episodio|episode)\\s+${numWords}`, 'gi'), (_m, kw) => `${kw} ${episodio}`)
          + coda;
      }

      const blob    = new Blob([patched], { type: 'text/vtt' });
      const blobUrl = URL.createObjectURL(blob);
      this.blobUrls.push(blobUrl);
      return blobUrl;
    } catch {
      return url;
    }
  }

  destroy(): void {
    this.blobUrls.forEach(u => URL.revokeObjectURL(u));
    this.blobUrls = [];
  }
}
