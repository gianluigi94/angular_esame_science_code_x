// ─── scheda-correlate.helper.ts ──────────────────────────────────────────────
// Carica le righe correlate per la scheda corrente.
// Estratto da scheda.component.ts.

import { take }               from 'rxjs/operators';
import { ApiService }         from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { mescolaDeterministicaLocandine } from 'src/app/_helpers_globali/helpers';

export type RigaCorrelata = {
  idCategoria: string;
  category:    string;
  locandine:   { src: string; titolo: string; sottotitolo: string; tipo: string; id_media: string }[];
};

export class SchedaCorrelateHelper {

  righeCorrelate:              RigaCorrelata[] = [];
  righeCorrelateInCaricamento = true;

  constructor(
    private api:         ApiService,
    private cambioLingua: CambioLinguaService,
    private getIdContenuto:   () => number | null,
    private getTipoContenuto: () => 'film' | 'serie' | null,
  ) {}

  // ── Estratto da caricaRigheCorrelate() ────────────────────────────────────
  caricaRigheCorrelate(mostraCaricamento = true): void {
    const id   = this.getIdContenuto();
    const tipo = this.getTipoContenuto();
    if (!id || !tipo) return;
    const lingua = this.cambioLingua.leggiCodiceLingua();
    if (mostraCaricamento) this.righeCorrelateInCaricamento = true;

    this.api.getCategoriePerContenuto(lingua, tipo, id).pipe(take(1)).subscribe({
      next: (ris: any) => {
        const items: any[] = Array.isArray(ris?.data?.items) ? ris.data.items : [];
        this.righeCorrelate = items
          .map((x: any) => ({
            idCategoria: String(x?.idCategoria || ''),
            category:    String(x?.category    || ''),
            locandine: (() => {
              const idCat = String(x?.idCategoria || '');
              const loc = (Array.isArray(x?.locandine) ? x.locandine : [])
                .map((p: any) => ({
                  src:        String(p?.src        || ''),
                  titolo:     String(p?.titolo      || ''),
                  sottotitolo: String(p?.sottotitolo || ''),
                  tipo:       String(p?.tipo        || ''),
                  id_media:   String(p?.id_media    || ''),
                }))
                .filter((p: any) => !!p.src);
              return loc.length
                ? (mescolaDeterministicaLocandine(loc, idCat) as typeof loc)
                : loc;
            })(),
          }))
          .filter(r => !!r.idCategoria);
        this.righeCorrelateInCaricamento = false;
      },
      error: () => { this.righeCorrelateInCaricamento = false; },
    });
  }

  // Estratto da tracciaRigaCorrelata()
  tracciaRigaCorrelata = (_i: number, riga: { idCategoria: string }): string =>
    riga.idCategoria;

  reset(): void {
    this.righeCorrelate              = [];
    this.righeCorrelateInCaricamento = true;
  }
}
