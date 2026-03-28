// ─── scheda-stagioni.helper.ts ───────────────────────────────────────────────
// Gestisce il caricamento e la selezione delle stagioni per le serie.
// Estratto da scheda.component.ts.

import { Location }          from '@angular/common';
import { ApiService }        from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { SchedaStateContext }  from '../scheda_utility/scheda-state.context';
import { attendi, precaricaImmagini, secondiInLeggibile } from '../scheda_utility/scheda-url.utils';

export class SchedaStagioniHelper {

  private idCaricamento               = 0;
  private readonly timerMinimoPlaceholderMs = 500;
  caricamentoStagioneInCorso          = false;

  constructor(
    private ctx:         SchedaStateContext,
    private api:         ApiService,
    private cambioLingua: CambioLinguaService,
    private location:    Location,
  ) {}

  // ── Estratto da selezionaStagione() ───────────────────────────────────────
  async selezionaStagione(numeroStagione: string): Promise<void> {
    const stagioneCorrente = this.ctx.stagioneSelezionata
      ?? (this.ctx.stagioni.length > 0 ? String(this.ctx.stagioni[0].numero_stagione) : null);
    if (
      stagioneCorrente === numeroStagione &&
      !this.caricamentoStagioneInCorso &&
      this.ctx.stagioneCachata.has(numeroStagione)
    ) return;

    this.aggiornaUrlStagione(numeroStagione);
    const mioId = ++this.idCaricamento;
    this.caricamentoStagioneInCorso  = true;
    this.ctx.stagioneSelezionata     = numeroStagione;

    if (!this.ctx.stagioneCachata.has(numeroStagione)) {
      const stagione = this.ctx.stagioni.find(s => String(s.numero_stagione) === numeroStagione);
      if (stagione) {
        await Promise.all([
          attendi(this.timerMinimoPlaceholderMs),
          this.caricaEpisodiStagione(stagione.id_stagione, numeroStagione),
        ]);
      } else {
        await attendi(this.timerMinimoPlaceholderMs);
      }
    } else {
      await precaricaImmagini(this.urlAnteprimePerStagione(numeroStagione));
    }

    if (mioId !== this.idCaricamento) return;
    this.caricamentoStagioneInCorso = false;
  }

  // ── Estratto da caricaEpisodiStagione() ───────────────────────────────────
  caricaEpisodiStagione(idStagione: number, numeroStagione: string): Promise<void> {
    const lingua = this.cambioLingua.leggiCodiceLingua();
    const slug   = this.ctx.slugCorrente;

    return new Promise<void>(resolve => {
      Promise.all([
        this.api.getEpisodi(idStagione).toPromise(),
        this.api.getEpisodiTraduzioni(idStagione, lingua).toPromise(),
      ]).then(([resEpisodi, resTrad]) => {
        const episodi:     any[] = Array.isArray(resEpisodi?.data) ? (resEpisodi as any).data : [];
        const traduzioni:  any[] = Array.isArray(resTrad?.data)    ? (resTrad    as any).data : [];

        const mapTrad: Record<number, { titolo: string; descrizione: string }> = {};
        traduzioni.forEach(t => {
          mapTrad[t.id_episodio] = { titolo: t.titolo || '', descrizione: t.descrizione || '' };
        });

        const offset = this.ctx.stagioni
          .filter(s => s.numero_stagione < Number(numeroStagione))
          .reduce((acc, s) => acc + s.numero_episodi, 0);

        const stagObj: Record<string, { titolo: string; descrizione: string; anteprima: string; durata: string }> = {};
        episodi.forEach(ep => {
          const numProgressivo = offset + ep.numero_episodio;
          const numPadded      = String(numProgressivo).padStart(2, '0');
          const anteprima      = slug ? `assets/screen/${slug}/${numPadded}.webp` : '';
          const trad           = mapTrad[ep.id_episodio] || { titolo: '', descrizione: '' };
          stagObj[`ep${ep.id_episodio}`] = {
            titolo: trad.titolo,
            descrizione: trad.descrizione,
            anteprima,
            durata: secondiInLeggibile(ep.durata),
          };
        });

        this.ctx.serieData = { ...this.ctx.serieData, [numeroStagione]: stagObj };
        this.ctx.stagioneCachata.add(numeroStagione);
        precaricaImmagini(this.urlAnteprimePerStagione(numeroStagione)).then(resolve);
      }).catch(() => resolve());
    });
  }

  // ── Estratto da urlAnteprimePerStagione() ─────────────────────────────────
  urlAnteprimePerStagione(numeroStagione: string): string[] {
    if (!this.ctx.serieData?.[numeroStagione]) return [];
    const episodi = this.ctx.serieData[numeroStagione];
    return Object.keys(episodi)
      .map(k => episodi[k]?.anteprima)
      .filter((u: any) => !!u);
  }

  // ── Estratto da aggiornaUrlStagione() ─────────────────────────────────────
  aggiornaUrlStagione(numeroStagione: string): void {
    const pathCompleto = this.location.path(false);
    const [path, query] = pathCompleto.split('?');
    const baseUrl  = path.replace(/\/(stagione|season)\/\d+$/, '');
    const segmento = path.includes('/en/') ? 'season' : 'stagione';
    const nuovoPath = `${baseUrl}/${segmento}/${numeroStagione}`;
    this.location.replaceState(query ? `${nuovoPath}?${query}` : nuovoPath);
  }
}
