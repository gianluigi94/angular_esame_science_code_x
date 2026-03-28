// ─── scheda-labels.helper.ts ─────────────────────────────────────────────────
// Gestisce tutte le etichette UI della scheda: traduzione, alt text, titoli.
// Estratto da scheda.component.ts.

import { take }               from 'rxjs/operators';
import { TranslateService }   from '@ngx-translate/core';
import { TitoloPaginaService } from 'src/app/_servizi_globali/titolo-pagina.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';

export class SchedaLabelsHelper {

  // ── Etichette esposte verso il template (via getter nel componente) ────────
  labelRiprendi      = '';
  labelRiproduci     = '';
  labelRiprendiTitle  = '';
  labelRiproduciTitle = '';
  labelTrailerTitle   = '';
  labelAnno          = '';
  labelDurata        = '';
  labelRegista       = '';
  labelEpisodiTotali = '';
  labelStagione      = '';
  labelEpisodio      = '';
  altSfondoScheda    = '';
  altTitoloScheda    = '';

  private _retryLabelTimer: any = null;

  constructor(
    private translate:     TranslateService,
    private titoloPagina:  TitoloPaginaService,
    private cambioLingua:  CambioLinguaService,
    private getTitoloScheda: () => string,
    private getTrailerInRiproduzione: () => boolean,
    private distrutto:     () => boolean,
  ) {}

  // ── Estratto da aggiornaAltSfondo() ───────────────────────────────────────
  aggiornaAltSfondo(): void {
    const titolo = this.getTitoloScheda();
    this.titoloPagina.impostaTitoloScheda(titolo);
    this.altSfondoScheda    = this.translate.instant('ui.carosello.altSfondo', { titolo });
    this.altTitoloScheda    = this.translate.instant('ui.carosello.altTitolo', { titolo });
    this.labelRiprendiTitle  = this.translate.instant('ui.scheda.riprendi.title.two',  { titolo });
    this.labelRiproduciTitle = this.translate.instant('ui.scheda.riproduci.title.two', { titolo });
    this.aggiornaTrailerTitle();
  }

  // ── Estratto da aggiornaTrailerTitle() ────────────────────────────────────
  aggiornaTrailerTitle(): void {
    const chiave = this.getTrailerInRiproduzione()
      ? 'ui.scheda.trailer.title.pause'
      : 'ui.scheda.trailer.title';
    this.labelTrailerTitle = this.translate.instant(chiave, { title: this.getTitoloScheda() });
  }

  // ── Estratto da aggiornaEtichetteUI() ─────────────────────────────────────
  aggiornaEtichetteUI(): void {
    this.labelRiprendi      = this.translate.instant('ui.scheda.riprendi.label');
    this.labelRiproduci     = this.translate.instant('ui.scheda.riproduci.label');
    this.labelAnno          = this.translate.instant('ui.scheda.anno.label');
    this.labelDurata        = this.translate.instant('ui.scheda.durata.label');
    this.labelRegista       = this.translate.instant('ui.scheda.regista.label');
    this.labelEpisodiTotali = this.translate.instant('ui.scheda.numero_episodi.label');
    this.labelStagione      = this.translate.instant('ui.scheda.stagione.label');
    this.labelEpisodio      = this.translate.instant('ui.scheda.episodio.label');
    this.aggiornaAltSfondo();
  }

  // ── Estratto da commitLabelUISincronizzate() ──────────────────────────────
  commitLabelUISincronizzate(): Promise<void> {
    if (this._retryLabelTimer) {
      clearTimeout(this._retryLabelTimer);
      this._retryLabelTimer = null;
    }
    return new Promise<void>((resolve) => {
      let retried = false;
      const prova = () => {
        if (this.distrutto()) { resolve(); return; }
        this.translate.get('ui.scheda.riprendi.label').pipe(take(1)).subscribe({
          next: (val: string) => {
            if (val === 'ui.scheda.riprendi.label') {
              retried = true;
              this._retryLabelTimer = setTimeout(() => {
                this._retryLabelTimer = null;
                prova();
              }, 300);
            } else {
              this.aggiornaEtichetteUI();
              if (retried) setTimeout(() => resolve(), 100);
              else         resolve();
            }
          },
          error: () => { this.aggiornaEtichetteUI(); resolve(); },
        });
      };
      prova();
    });
  }

  clearRetryTimer(): void {
    if (this._retryLabelTimer) {
      clearTimeout(this._retryLabelTimer);
      this._retryLabelTimer = null;
    }
  }

}
