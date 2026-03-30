// Helper che gestisce il click sulla locandina, prepara i dati utili e avvia la navigazione verso la scheda.

import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { TipoContenutoService } from '../categoria_services/tipo-contenuto.service';
import { StopVideoGlobaleService } from '../categoria_services/stop-video-globale.service';
import { slugDaLocandina } from 'src/app/_helpers_globali/helpers';
import { buildCatalogUrl } from '../categoria_utility/categoria-url.utils';

export class CategoriaClickHelper {
  constructor(
    private router: Router,
    private api: ApiService,
    private cambioLingua: CambioLinguaService,
    private tipoContenuto: TipoContenutoService,
    private stopVideoGlobale: StopVideoGlobaleService,
  ) {}

  /**
   * Restituisce il tipo del contenuto cliccato.
   * - Usa prima il tipo presente nella locandina
   * - Se non e' valido usa il tipo attualmente selezionato
   * - Fa fallback finale su film
   *
   * @param loc Locandina cliccata con il tipo associato.
   * @returns string Tipo risolto del contenuto.
   */
  tipoDaClick(loc: { tipo: string }): string {
    const tipoLoc = String(loc?.tipo || '').toLowerCase(); // ricavo il tipo dichiarato dalla locandina
    if (tipoLoc === 'film' || tipoLoc === 'serie') return tipoLoc; // se il tipo e' valido lo uso subito
    const selezionato = this.tipoContenuto.leggiTipo(); // leggo il tipo correntemente selezionato nel contesto
    return selezionato === 'serie' ? 'serie' : 'film'; // faccio fallback su serie oppure film
  }

  /**
   * Esegue il flusso completo del click su una locandina.
   * - Valida l'id del contenuto
   * - Applica eventuali ritardi configurati
   * - Salva informazioni di contesto in sessionStorage se abilitato
   * - Precarica sfondo e immagine titolo della scheda
   * - Recupera traduzioni e dati tabellari dal backend
   * - Coordina lo stop o il fade dell'audio/video globale
   * - Avvia la navigazione passando lo state necessario
   *
   * @param loc Locandina cliccata con tipo, id media e sorgente immagine.
   * @param config Configurazione del comportamento di click e navigazione.
   * @param onClearHoverTimers Callback usata per pulire eventuali timer hover ancora attivi.
   * @returns Promise<void> Promise risolta quando il flusso di navigazione e' stato completato.
   */
  async onClickLocandina(
    loc: { tipo: string; id_media: string; src: string },
    config: {
      ritardoClickLocandinaMs: number;
      ritardoNavigazioneStessaTipologiaMs: number;
      attendiChiusuraPlayerSchedaPrimaDiNavigare: boolean;
      abilitaSalvataggiSessionStorage: boolean;
      idCategoria: string;
    },
    onClearHoverTimers: () => void,
  ): Promise<void> {
    const id = String(loc?.id_media || '').trim(); // ricavo l'id del contenuto cliccato
    if (!id) return; // esco subito se l'id non e' valido

    const ritardoClick = Math.max(0, config.ritardoClickLocandinaMs || 0); // normalizzo il ritardo iniziale del click
    if (ritardoClick > 0)
      await new Promise<void>((resolve) => setTimeout(resolve, ritardoClick)); // aspetto il ritardo iniziale se configurato

    if (config.abilitaSalvataggiSessionStorage) {
      try {
        sessionStorage.setItem(
          'ultima_categoria_click',
          String(config.idCategoria || '').trim(),
        );
      } catch {} // provo a salvare la categoria cliccata senza rompere il flusso
    }

    const tipo = this.tipoDaClick(loc); // risolvo il tipo effettivo del contenuto
    const codice = this.cambioLingua.leggiCodiceLingua(); // leggo il codice lingua corrente
    const url = buildCatalogUrl(codice, tipo, id); // costruisco la destinazione finale della navigazione
    const slug = slugDaLocandina(loc.src); // ricavo lo slug partendo dalla locandina
    const urlSfondo = `assets/carosello_locandine/carosello_${slug}.webp`; // costruisco l'URL dello sfondo della scheda
    const urlImgTitolo = `assets/titoli_${codice}/titolo_${codice}_${slug}.webp`; // costruisco l'URL dell'immagine titolo

    onClearHoverTimers(); // pulisco eventuali timer hover ancora attivi prima di procedere

    const caricaImmagine = (src: string): Promise<void> =>
      new Promise((resolve) => {
        const img = new Image(); // creo un'immagine temporanea per il preload
        img.onload = img.onerror = () => resolve(); // considero completato il preload sia in successo sia in errore
        img.src = src; // faccio partire il caricamento assegnando la sorgente
      });

    const traduzioni$ =
      tipo === 'film'
        ? this.api.getFilmTraduzioni(id, codice)
        : this.api.getSerieTraduzioni(id, codice); // preparo la chiamata API per le traduzioni
    const tabella$ =
      tipo === 'film'
        ? this.api.getFilm(id)
        : this.api.getSerie(id); // preparo la chiamata API per i dati tabellari

    if (config.attendiChiusuraPlayerSchedaPrimaDiNavigare)
      await this.stopVideoGlobale
        .richiediChiusuraCompletaPlayerScheda(400)
        .catch(() => {}); // provo a chiudere completamente il player della scheda prima della navigazione

    const [, , tradRes, tabellaRes] = await Promise.all([
      caricaImmagine(urlSfondo), // precarico lo sfondo della scheda
      caricaImmagine(urlImgTitolo), // precarico l'immagine titolo della scheda
      firstValueFrom(traduzioni$.pipe(take(1))).catch(() => null), // leggo una sola emissione delle traduzioni con fallback nullo
      firstValueFrom(tabella$.pipe(take(1))).catch(() => null), // leggo una sola emissione dei dati tabellari con fallback nullo
    ]);

    const descrizioneTestuale = String((tradRes as any)?.data?.descrizione || ''); // estraggo la descrizione testuale dalla risposta traduzioni
    const tabellaDati = (tabellaRes as any)?.data ?? null; // estraggo i dati tabellari dalla risposta principale

    if (!config.attendiChiusuraPlayerSchedaPrimaDiNavigare)
      await this.stopVideoGlobale.richiediSoloFadeAudio(350).catch(() => {}); // se non devo chiudere il player faccio solo fade audio prima di navigare

    if (config.ritardoNavigazioneStessaTipologiaMs > 0)
      await new Promise<void>((resolve) =>
        setTimeout(resolve, config.ritardoNavigazioneStessaTipologiaMs),
      ); // applico l'eventuale ritardo finale prima della navigazione

    this.router.navigateByUrl(url, {
      state: { urlSfondo, urlImgTitolo, descrizioneTestuale, tabellaDati },
    }); // navigo passando nello state gli asset e i dati gia' preparati
  }
}
