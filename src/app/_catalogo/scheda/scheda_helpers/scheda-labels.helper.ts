// Helper che gestisce le etichette UI, gli alt text e i titoli localizzati della scheda.

import { take } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { TitoloPaginaService } from 'src/app/_servizi_globali/titolo-pagina.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';

export class SchedaLabelsHelper {
  labelRiprendi = ''; // la label del bottone riprendi
  labelRiproduci = ''; //la label del bottone riproduci
  labelRiprendiTitle = ''; // il title del bottone riprendi
  labelRiproduciTitle = ''; // il title del bottone riproduci
  labelTrailerTitle = ''; // il title del bottone trailer
  labelAnno = ''; // la label del campo anno
  labelDurata = ''; // la label del campo durata
  labelRegista = ''; // la label del campo regista
  labelEpisodiTotali = ''; //la label del totale episodi
  labelStagione = ''; // la label della stagione
  labelEpisodio = ''; // la label dell'episodio
  altSfondoScheda = ''; // l'alt dello sfondo scheda
  altTitoloScheda = ''; // l'alt del titolo scheda

  private _retryLabelTimer: any = null; // il timer di retry delle traduzioni UI

  constructor(
    private translate: TranslateService,
    private titoloPagina: TitoloPaginaService,
    private cambioLingua: CambioLinguaService,
    private getTitoloScheda: () => string,
    private getTrailerInRiproduzione: () => boolean,
    private distrutto: () => boolean,
  ) {}

  /**
   * Aggiorna gli alt text e i title principali della scheda.
   * - Legge il titolo corrente della scheda
   * - Aggiorna il titolo pagina globale
   * - Aggiorna alt text e title localizzati
   * - Riallinea anche il title del trailer
   *
   * @returns void
   */
  aggiornaAltSfondo(): void {
    const titolo = this.getTitoloScheda(); // leggo il titolo corrente della scheda
    this.titoloPagina.impostaTitoloScheda(titolo); // aggiorno il titolo pagina globale
    this.altSfondoScheda = this.translate.instant('ui.carosello.altSfondo', { titolo }); // costruisco l'alt dello sfondo
    this.altTitoloScheda = this.translate.instant('ui.carosello.altTitolo', { titolo }); // costruisco l'alt del titolo
    this.labelRiprendiTitle = this.translate.instant('ui.scheda.riprendi.title.two', { titolo }); // aggiorno il title di riprendi
    this.labelRiproduciTitle = this.translate.instant('ui.scheda.riproduci.title.two', { titolo }); // aggiorno il title di riproduci
    this.aggiornaTrailerTitle(); // riallineo anche il title del trailer
  }

  /**
   * Aggiorna il title del bottone trailer in base allo stato corrente.
   * - Usa una chiave diversa se il trailer e' in riproduzione
   * - Inserisce il titolo corrente della scheda nei parametri
   *
   * @returns void
   */
  aggiornaTrailerTitle(): void {
    const chiave = this.getTrailerInRiproduzione()
      ? 'ui.scheda.trailer.title.pause'
      : 'ui.scheda.trailer.title'; // scelgo la chiave in base allo stato del trailer
    this.labelTrailerTitle = this.translate.instant(chiave, { title: this.getTitoloScheda() }); // aggiorno il title del trailer
  }

  /**
   * Aggiorna tutte le etichette UI localizzate della scheda.
   * - Aggiorna le label testuali dei campi e dei bottoni
   * - Aggiorna poi alt text e title collegati
   *
   * @returns void
   */
  aggiornaEtichetteUI(): void {
    this.labelRiprendi = this.translate.instant('ui.scheda.riprendi.label'); // aggiorno la label di riprendi
    this.labelRiproduci = this.translate.instant('ui.scheda.riproduci.label'); // aggiorno la label di riproduci
    this.labelAnno = this.translate.instant('ui.scheda.anno.label'); // aggiorno la label dell'anno
    this.labelDurata = this.translate.instant('ui.scheda.durata.label'); // aggiorno la label della durata
    this.labelRegista = this.translate.instant('ui.scheda.regista.label'); // aggiorno la label del regista
    this.labelEpisodiTotali = this.translate.instant('ui.scheda.numero_episodi.label'); // aggiorno la label del numero episodi
    this.labelStagione = this.translate.instant('ui.scheda.stagione.label'); // aggiorno la label della stagione
    this.labelEpisodio = this.translate.instant('ui.scheda.episodio.label'); // aggiorno la label dell'episodio
    this.aggiornaAltSfondo(); // aggiorno alt e title collegati
  }

  /**
   * Sincronizza le label UI aspettando che le traduzioni siano davvero disponibili.
   * - Cancella eventuali retry precedenti
   * - Verifica una chiave sentinella delle traduzioni
   * - Se la traduzione non e' pronta riprova dopo un ritardo
   * - Quando la traduzione e' pronta aggiorna tutte le etichette
   *
   * @returns Promise<void> Promise risolta quando le etichette risultano sincronizzate.
   */
  commitLabelUISincronizzate(): Promise<void> {
    if (this._retryLabelTimer) {
      clearTimeout(this._retryLabelTimer);
      this._retryLabelTimer = null;
    } // cancello un eventuale retry precedente

    return new Promise<void>((resolve) => {
      let retried = false; // segno se ho gia' dovuto riprovare almeno una volta

      const prova = () => {
        if (this.distrutto()) {
          resolve();
          return;
        } // esco subito se il contesto e' gia' stato distrutto

        this.translate.get('ui.scheda.riprendi.label').pipe(take(1)).subscribe({
          next: (val: string) => {
            if (val === 'ui.scheda.riprendi.label') {
              retried = true; // segno che la traduzione non era ancora pronta
              this._retryLabelTimer = setTimeout(() => {
                this._retryLabelTimer = null; // pulisco il riferimento al timer prima di riprovare
                prova(); // ripeto il controllo dopo l'attesa
              }, 300);
            } else {
              this.aggiornaEtichetteUI(); // aggiorno tutte le etichette quando la traduzione e' pronta
              if (retried) setTimeout(() => resolve(), 100); // se ho riprovato aspetto ancora un attimo prima di risolvere
              else resolve(); // altrimenti risolvo subito
            }
          },
          error: () => {
            this.aggiornaEtichetteUI(); // in errore aggiorno comunque le etichette
            resolve(); // risolvo senza bloccare il flusso
          },
        });
      };

      prova(); // avvio il primo tentativo di sincronizzazione
    });
  }

  /**
   * Cancella il timer di retry delle label se presente.
   *
   * @returns void
   */
  clearRetryTimer(): void {
    if (this._retryLabelTimer) {
      clearTimeout(this._retryLabelTimer); // cancello il timer di retry attivo
      this._retryLabelTimer = null; // pulisco il riferimento al timer
    }
  }
}
