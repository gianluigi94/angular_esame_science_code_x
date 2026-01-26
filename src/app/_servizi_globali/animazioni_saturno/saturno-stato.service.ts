import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SaturnoStatoService {
  saturnoPronto$ = new BehaviorSubject<boolean>(false);

  setPronto(): void {
    if (!this.saturnoPronto$.value) this.saturnoPronto$.next(true);
  }

  reset(): void {
    if (this.saturnoPronto$.value) this.saturnoPronto$.next(false);
  }
}
