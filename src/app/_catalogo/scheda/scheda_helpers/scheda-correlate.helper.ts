// Helper che carica e prepara le righe correlate della scheda corrente.

import { take } from 'rxjs/operators';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { mescolaDeterministicaLocandine } from 'src/app/_helpers_globali/helpers';

export type RigaCorrelata = {
  idCategoria: string;
  category: string;
  locandine: { src: string; titolo: string; sottotitolo: string; tipo: string; id_media: string }[];
};

export class SchedaCorrelateHelper {
  righeCorrelate: RigaCorrelata[] = []; // tengo le righe correlate pronte per la scheda
  righeCorrelateInCaricamento = true; // segno se le righe correlate sono ancora in caricamento

  constructor(
    private api: ApiService,
    private cambioLingua: CambioLinguaService,
    private getIdContenuto: () => number | null,
    private getTipoContenuto: () => 'film' | 'serie' | null,
  ) {}

  /**
   * Carica le righe correlate per il contenuto corrente.
   * - Legge id e tipo correnti
   * - Recupera la lingua attiva
   * - Chiama l'API delle categorie correlate
   * - Normalizza le locandine ricevute
   * - Applica il mescolamento deterministico per categoria
   *
   * @param mostraCaricamento Indica se attivare lo stato di caricamento prima della chiamata.
   * @returns void
   */
  caricaRigheCorrelate(mostraCaricamento = true): void {
    const id = this.getIdContenuto(); // leggo l'id del contenuto corrente
    const tipo = this.getTipoContenuto(); // leggo il tipo del contenuto corrente
    if (!id || !tipo) return; // esco se non ho un contenuto valido
    const lingua = this.cambioLingua.leggiCodiceLingua(); // leggo la lingua corrente
    if (mostraCaricamento) this.righeCorrelateInCaricamento = true; // attivo lo stato di caricamento se richiesto

    this.api.getCategoriePerContenuto(lingua, tipo, id).pipe(take(1)).subscribe({
      next: (ris: any) => {
        const items: any[] = Array.isArray(ris?.data?.items) ? ris.data.items : []; // ricavo la lista grezza delle categorie correlate
        this.righeCorrelate = items
          .map((x: any) => ({
            idCategoria: String(x?.idCategoria || ''), // normalizzo l'id categoria
            category: String(x?.category || ''), // normalizzo il nome categoria
            locandine: (() => {
              const idCat = String(x?.idCategoria || ''); // ricavo l'id categoria usato per il mescolamento deterministico
              const loc = (Array.isArray(x?.locandine) ? x.locandine : [])
                .map((p: any) => ({
                  src: String(p?.src || ''), // normalizzo la src della locandina
                  titolo: String(p?.titolo || ''), // normalizzo il titolo della locandina
                  sottotitolo: String(p?.sottotitolo || ''), // normalizzo il sottotitolo della locandina
                  tipo: String(p?.tipo || ''), // normalizzo il tipo della locandina
                  id_media: String(p?.id_media || ''), // normalizzo l'id media della locandina
                }))
                .filter((p: any) => !!p.src); // tengo solo le locandine che hanno una src valida
              return loc.length
                ? (mescolaDeterministicaLocandine(loc, idCat) as typeof loc) // mescolo in modo deterministico le locandine della categoria
                : loc; // se non ho locandine valide restituisco la lista cosi' com'e'
            })(),
          }))
          .filter((r) => !!r.idCategoria); // tengo solo le righe con id categoria valido
        this.righeCorrelateInCaricamento = false; // segno che il caricamento delle correlate e' finito
      },
      error: () => {
        this.righeCorrelateInCaricamento = false; // in caso di errore chiudo comunque lo stato di caricamento
      },
    });
  }

  /**
   * Restituisce la chiave trackBy della riga correlata.
   *
   * @param _i Indice della riga nel ciclo corrente.
   * @param riga Riga correlata corrente.
   * @returns string Chiave stabile da usare nel trackBy.
   */
  tracciaRigaCorrelata = (_i: number, riga: { idCategoria: string }): string =>
    riga.idCategoria; // uso l'id categoria come chiave stabile della riga correlata

  /**
   * Reimposta lo stato delle righe correlate al valore iniziale.
   *
   * @returns void
   */
  reset(): void {
    this.righeCorrelate = []; // svuoto le righe correlate correnti
    this.righeCorrelateInCaricamento = true; // riporto il flag di caricamento allo stato iniziale
  }
}
