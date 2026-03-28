// ─── categoria-hover.helper.ts ───────────────────────────────────────────────
// Gestisce l'hover sulle locandine (entrata / uscita con debounce).
// Estratto da riga-categoria.component.ts: onMouseEnterLocandina, onMouseLeaveLocandina.

import { HoverLocandinaService } from '../categoria_services/hover-locandina.service';
import { CambioLinguaService }   from 'src/app/_servizi_globali/cambio-lingua.service';
import { slugDaLocandina }       from 'src/app/_helpers_globali/helpers';
import { urlTrailerHover }       from '../categoria_utility/categoria-url.utils';

export class CategoriaHoverHelper {

  private timerEntrata: any = null;
  private timerUscita:  any = null;
  private readonly ritardoHoverMs      = 380;
  private readonly ritardoUscitaHoverMs = 320;

  constructor(
    private hoverService: HoverLocandinaService,
    private cambioLingua: CambioLinguaService,
  ) {}

  // ── Estratto da onMouseEnterLocandina() ───────────────────────────────────
  onMouseEnterLocandina(loc: { src: string; titolo: string; sottotitolo: string }): void {
    if (this.timerUscita)   clearTimeout(this.timerUscita);
    if (this.timerEntrata)  clearTimeout(this.timerEntrata);

    this.timerEntrata = setTimeout(() => {
      const slug       = slugDaLocandina(loc.src);
      const urlSfondo  = `assets/carosello_locandine/carosello_${slug}.webp`;
      const lang       = this.cambioLingua.leggiCodiceLingua();
      const urlTrailer = urlTrailerHover(lang, slug);
      const descrizione = `film.${slug}`;

      this.hoverService.emettiEntrata(
        urlSfondo,
        urlTrailer,
        descrizione,
        String(loc?.titolo    || ''),
        String(loc?.sottotitolo || ''),
      );
    }, this.ritardoHoverMs);
  }

  // ── Estratto da onMouseLeaveLocandina() ───────────────────────────────────
  onMouseLeaveLocandina(): void {
    if (this.timerEntrata)  clearTimeout(this.timerEntrata);
    if (this.timerUscita)   clearTimeout(this.timerUscita);

    this.timerUscita = setTimeout(() => {
      if (document.querySelector('.locandina:hover')) return;
      this.hoverService.emettiUscita();
    }, this.ritardoUscitaHoverMs);
  }

  // Solo cancella i timer (usato da onClickLocandina, che non vuole emettere uscita)
  clearTimers(): void {
    if (this.timerEntrata) clearTimeout(this.timerEntrata);
    if (this.timerUscita)  clearTimeout(this.timerUscita);
  }

  // Cancella timer + emette uscita (usato da ngOnDestroy)
  destroy(): void {
    this.clearTimers();
    try { this.hoverService.emettiUscita(); } catch {}
  }
}
