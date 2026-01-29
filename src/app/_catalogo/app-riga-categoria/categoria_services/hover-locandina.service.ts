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
  });

  osserva(): Observable<{
    attivo: boolean;
    urlSfondo: string;
    urlTrailer: string;
    descrizione: string;
    titolo: string;
    sottotitolo: string;
  }> {
    return this.hoverLocandina$.asObservable();
  }

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
    });
  }

  emettiUscita(): void {
    this.hoverLocandina$.next({
      attivo: false,
      urlSfondo: '',
      urlTrailer: '',
      descrizione: '',
      titolo: '',
      sottotitolo: '',
    });
  }
}
