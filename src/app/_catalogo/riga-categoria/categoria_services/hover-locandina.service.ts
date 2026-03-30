// Servizio che espone lo stato hover della locandina e notifica entrata e uscita ai subscriber.

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HoverLocandinaService {
  hoverLocandina$ = new BehaviorSubject<{
    attivo: boolean;
    urlSfondo: string;
    urlTrailer: string;
    descrizione: string;
    titolo: string;
    sottotitolo: string;
  }>({
    attivo: false,
    urlSfondo: '',
    urlTrailer: '',
    descrizione: '',
    titolo: '',
    sottotitolo: '',
  }); // tengo lo stato corrente dell'hover locandina

  /**
   * Restituisce l'Observable dello stato hover della locandina.
   *
   * @returns Observable<{ attivo: boolean; urlSfondo: string; urlTrailer: string; descrizione: string; titolo: string; sottotitolo: string; }> Stream osservabile dello stato hover corrente.
   */
  osserva(): Observable<{
    attivo: boolean;
    urlSfondo: string;
    urlTrailer: string;
    descrizione: string;
    titolo: string;
    sottotitolo: string;
  }> {
    return this.hoverLocandina$.asObservable(); // espongo lo stream osservabile dello stato hover
  }

  /**
   * Emette lo stato di entrata hover con tutti i dati associati alla locandina.
   *
   * @param urlSfondo URL dello sfondo associato all'hover.
   * @param urlTrailer URL del trailer associato all'hover.
   * @param descrizione Descrizione semantica del contenuto in hover.
   * @param titolo Titolo del contenuto in hover.
   * @param sottotitolo Sottotitolo del contenuto in hover.
   * @returns void
   */
  emettiEntrata(
    urlSfondo: string,
    urlTrailer: string,
    descrizione: string,
    titolo: string,
    sottotitolo: string,
  ): void {
    this.hoverLocandina$.next({
      attivo: true,
      urlSfondo: String(urlSfondo || ''),
      urlTrailer: String(urlTrailer || ''),
      descrizione: String(descrizione || ''),
      titolo: String(titolo || ''),
      sottotitolo: String(sottotitolo || ''),
    }); // pubblico lo stato di entrata hover normalizzando tutti i campi
  }

  /**
   * Emette lo stato di uscita hover ripulendo tutti i dati associati.
   *
   * @returns void
   */
  emettiUscita(): void {
    this.hoverLocandina$.next({
      attivo: false,
      urlSfondo: '',
      urlTrailer: '',
      descrizione: '',
      titolo: '',
      sottotitolo: '',
    }); // pubblico lo stato di uscita hover azzerando tutti i campi
  }
}
