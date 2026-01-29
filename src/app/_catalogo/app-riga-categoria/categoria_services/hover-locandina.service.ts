import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HoverLocandinaService {
hoverLocandina$ = new BehaviorSubject<{ attivo: boolean; urlSfondo: string; urlTrailer: string; descrizione: string }>({
  attivo: false,
  urlSfondo: '',
  urlTrailer: '',
  descrizione: '',
});

osserva(): Observable<{ attivo: boolean; urlSfondo: string; urlTrailer: string; descrizione: string }> {
  return this.hoverLocandina$.asObservable();
}

emettiEntrata(urlSfondo: string, urlTrailer: string, descrizione: string): void {
  this.hoverLocandina$.next({
    attivo: true,
    urlSfondo: String(urlSfondo || ''),
    urlTrailer: String(urlTrailer || ''),
    descrizione: String(descrizione || ''),
  });
}

emettiUscita(): void {
  this.hoverLocandina$.next({ attivo: false, urlSfondo: '', urlTrailer: '', descrizione: '' });
}
}
