// ─── categoria-click.helper.ts ───────────────────────────────────────────────
// Logica del click su una locandina: precarica risorse, chiama API, naviga.
// Estratto da riga-categoria.component.ts: onClickLocandina, precaricaRisorseScheda,
// baseCatalogoDaLingua, fogliaDaTipo, tipoDaClick.

import { Router }              from '@angular/router';
import { firstValueFrom }      from 'rxjs';
import { take }                from 'rxjs/operators';
import { ApiService }          from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { TipoContenutoService } from '../categoria_services/tipo-contenuto.service';
import { StopVideoGlobaleService } from '../categoria_services/stop-video-globale.service';
import { slugDaLocandina }     from 'src/app/_helpers_globali/helpers';
import { buildCatalogUrl }     from '../categoria_utility/categoria-url.utils';

export class CategoriaClickHelper {

  constructor(
    private router:            Router,
    private api:               ApiService,
    private cambioLingua:      CambioLinguaService,
    private tipoContenuto:     TipoContenutoService,
    private stopVideoGlobale:  StopVideoGlobaleService,
  ) {}

  // ── Estratto da tipoDaClick() ─────────────────────────────────────────────
  tipoDaClick(loc: { tipo: string }): string {
    const tipoLoc = String(loc?.tipo || '').toLowerCase();
    if (tipoLoc === 'film' || tipoLoc === 'serie') return tipoLoc;
    const selezionato = this.tipoContenuto.leggiTipo();
    return selezionato === 'serie' ? 'serie' : 'film';
  }

  // ── Estratto da onClickLocandina() ────────────────────────────────────────
  async onClickLocandina(
    loc: { tipo: string; id_media: string; src: string },
    config: {
      ritardoClickLocandinaMs:                    number;
      ritardoNavigazioneStessaTipologiaMs:        number;
      attendiChiusuraPlayerSchedaPrimaDiNavigare: boolean;
      abilitaSalvataggiSessionStorage:            boolean;
      idCategoria:                                string;
    },
    onClearHoverTimers: () => void,
  ): Promise<void> {
    const id = String(loc?.id_media || '').trim();
    if (!id) return;

    const ritardoClick = Math.max(0, config.ritardoClickLocandinaMs || 0);
    if (ritardoClick > 0)
      await new Promise<void>((resolve) => setTimeout(resolve, ritardoClick));

    if (config.abilitaSalvataggiSessionStorage) {
      try { sessionStorage.setItem('ultima_categoria_click', String(config.idCategoria || '').trim()); } catch {}
    }

    const tipo    = this.tipoDaClick(loc);
    const codice  = this.cambioLingua.leggiCodiceLingua();
    const url     = buildCatalogUrl(codice, tipo, id);
    const slug    = slugDaLocandina(loc.src);
    const urlSfondo    = `assets/carosello_locandine/carosello_${slug}.webp`;
    const urlImgTitolo = `assets/titoli_${codice}/titolo_${codice}_${slug}.webp`;

    onClearHoverTimers();

    const caricaImmagine = (src: string): Promise<void> =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = img.onerror = () => resolve();
        img.src = src;
      });

    const traduzioni$ = tipo === 'film'
      ? this.api.getFilmTraduzioni(id, codice)
      : this.api.getSerieTraduzioni(id, codice);
    const tabella$ = tipo === 'film'
      ? this.api.getFilm(id)
      : this.api.getSerie(id);

    if (config.attendiChiusuraPlayerSchedaPrimaDiNavigare)
      await this.stopVideoGlobale.richiediChiusuraCompletaPlayerScheda(400).catch(() => {});

    const [, , tradRes, tabellaRes] = await Promise.all([
      caricaImmagine(urlSfondo),
      caricaImmagine(urlImgTitolo),
      firstValueFrom(traduzioni$.pipe(take(1))).catch(() => null),
      firstValueFrom(tabella$.pipe(take(1))).catch(() => null),
    ]);

    const descrizioneTestuale = String((tradRes as any)?.data?.descrizione || '');
    const tabellaDati         = (tabellaRes as any)?.data ?? null;

    if (!config.attendiChiusuraPlayerSchedaPrimaDiNavigare)
      await this.stopVideoGlobale.richiediSoloFadeAudio(350).catch(() => {});

    if (config.ritardoNavigazioneStessaTipologiaMs > 0)
      await new Promise<void>((resolve) =>
        setTimeout(resolve, config.ritardoNavigazioneStessaTipologiaMs)
      );

    this.router.navigateByUrl(url, {
      state: { urlSfondo, urlImgTitolo, descrizioneTestuale, tabellaDati },
    });
  }
}
