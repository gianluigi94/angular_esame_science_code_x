 import { Injectable } from '@angular/core';
 import { BehaviorSubject } from 'rxjs';

 @Injectable({ providedIn: 'root' })
 export class SaturnoStatoService {
   saturnoPronto$ = new BehaviorSubject<boolean>(false);
  timerPronto: ReturnType<typeof setTimeout> | null = null;

   setPronto(): void {
    if (this.saturnoPronto$.value) {
      return;
    }

    if (this.timerPronto) {
      return;
    }

    this.timerPronto = setTimeout(() => {
      this.saturnoPronto$.next(true);
      this.timerPronto = null;
    }, 50);
   }

   reset(): void {
    if (this.timerPronto) {
      clearTimeout(this.timerPronto);
      this.timerPronto = null;
    }

    if (this.saturnoPronto$.value) {
      this.saturnoPronto$.next(false);
    }
   }
 }
