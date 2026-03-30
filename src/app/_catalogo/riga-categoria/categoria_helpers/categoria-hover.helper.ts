// Helper che gestisce l'hover sulle locandine con debounce in entrata e in uscita.

import { HoverLocandinaService } from '../categoria_services/hover-locandina.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { slugDaLocandina } from 'src/app/_helpers_globali/helpers';
import { urlTrailerHover } from '../categoria_utility/categoria-url.utils';

export class CategoriaHoverHelper {
  private timerEntrata: any = null; // tengo il timer che ritarda l'entrata hover
  private timerUscita: any = null; // tengo il timer che ritarda l'uscita hover
  private readonly ritardoHoverMs = 380; // imposto il ritardo prima di attivare l'hover
  private readonly ritardoUscitaHoverMs = 320; // imposto il ritardo prima di chiudere l'hover

  constructor(
    private hoverService: HoverLocandinaService,
    private cambioLingua: CambioLinguaService,
  ) {}

  /**
   * Avvia la logica di entrata hover sulla locandina.
   * - Annulla eventuali timer di uscita o di entrata gia' attivi
   * - Attende il debounce configurato
   * - Costruisce gli URL necessari per sfondo e trailer hover
   * - Emette l'evento di entrata con i contenuti della locandina
   *
   * @param loc Locandina attualmente in hover con immagine, titolo e sottotitolo.
   * @returns void
   */
  onMouseEnterLocandina(loc: { src: string; titolo: string; sottotitolo: string }): void {
    if (this.timerUscita) clearTimeout(this.timerUscita); // annullo l'eventuale chiusura hover pendente
    if (this.timerEntrata) clearTimeout(this.timerEntrata); // annullo l'eventuale entrata hover gia' pianificata

    this.timerEntrata = setTimeout(() => {
      const slug = slugDaLocandina(loc.src); // ricavo lo slug partendo dalla locandina
      const urlSfondo = `assets/carosello_locandine/carosello_${slug}.webp`; // costruisco l'URL dello sfondo hover
      const lang = this.cambioLingua.leggiCodiceLingua(); // leggo la lingua corrente
      const urlTrailer = urlTrailerHover(lang, slug); // costruisco l'URL del trailer hover
      const descrizione = `film.${slug}`; // costruisco la descrizione semantica associata al contenuto

      this.hoverService.emettiEntrata(
        urlSfondo,
        urlTrailer,
        descrizione,
        String(loc?.titolo || ''),
        String(loc?.sottotitolo || ''),
      ); // emetto l'entrata hover con tutti i dati necessari
    }, this.ritardoHoverMs);
  }

  /**
   * Avvia la logica di uscita hover dalla locandina.
   * - Annulla eventuali timer di entrata o uscita gia' attivi
   * - Attende il debounce configurato
   * - Verifica se nel frattempo il mouse e' ancora sopra una locandina
   * - Emette l'uscita hover solo quando non ci sono piu' locandine attive
   *
   * @returns void
   */
  onMouseLeaveLocandina(): void {
    if (this.timerEntrata) clearTimeout(this.timerEntrata); // annullo l'eventuale entrata hover ancora pendente
    if (this.timerUscita) clearTimeout(this.timerUscita); // annullo l'eventuale uscita hover gia' pianificata

    this.timerUscita = setTimeout(() => {
      if (document.querySelector('.locandina:hover')) return; // esco se nel frattempo il mouse e' ancora sopra una locandina
      this.hoverService.emettiUscita(); // notifico l'uscita hover quando nessuna locandina e' attiva
    }, this.ritardoUscitaHoverMs);
  }

  /**
   * Cancella i timer interni legati all'hover.
   * - Non emette eventi di uscita
   * - Serve quando il chiamante vuole solo fermare i debounce pendenti
   *
   * @returns void
   */
  clearTimers(): void {
    if (this.timerEntrata) clearTimeout(this.timerEntrata); // cancello il timer di entrata se presente
    if (this.timerUscita) clearTimeout(this.timerUscita); // cancello il timer di uscita se presente
  }

  /**
   * Ripulisce completamente lo stato hover dell'helper.
   * - Cancella tutti i timer pendenti
   * - Prova a emettere l'uscita hover finale
   *
   * @returns void
   */
  destroy(): void {
    this.clearTimers(); // pulisco prima tutti i timer hover ancora attivi
    try {
      this.hoverService.emettiUscita();
    } catch {} // provo a notificare l'uscita finale senza rompere il flusso
  }
}
