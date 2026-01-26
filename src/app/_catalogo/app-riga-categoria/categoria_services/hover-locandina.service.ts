import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HoverLocandinaService {
  hoverAttivo$ = new BehaviorSubject<boolean>(false);

  osserva(): Observable<boolean> {
    return this.hoverAttivo$.asObservable();
  }

  emettiEntrata(): void {
    this.hoverAttivo$.next(true);
  }

  emettiUscita(): void {
    this.hoverAttivo$.next(false);
  }
}
