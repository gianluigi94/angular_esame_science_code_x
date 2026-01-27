import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HoverLocandinaService {
   hoverLocandina$ = new BehaviorSubject<{ attivo: boolean; urlSfondo: string }>({
 attivo: false,
 urlSfondo: '',
 });

   osserva(): Observable<{ attivo: boolean; urlSfondo: string }> {
 return this.hoverLocandina$.asObservable();
  }

   emettiEntrata(urlSfondo: string): void {
 this.hoverLocandina$.next({ attivo: true, urlSfondo: String(urlSfondo || '') });
  }

  emettiUscita(): void {
    this.hoverLocandina$.next({ attivo: false, urlSfondo: '' });
  }
}
