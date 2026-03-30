// Service che gestisce lo stato di prontezza di Saturno e il relativo debounce temporale.

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SaturnoStatoService {
  saturnoPronto$ = new BehaviorSubject<boolean>(false); // espongo lo stato osservabile che indica se Saturno e' pronto
  timerPronto: ReturnType<typeof setTimeout> | null = null; // conservo il timer usato per ritardare la segnalazione di prontezza

  /**
   * Imposta Saturno come pronto con un piccolo ritardo evitando duplicazioni.
   *
   * @returns void
   */
  setPronto(): void {
    if (this.saturnoPronto$.value) { // controllo se Saturno risulta gia' pronto
      return; // esco subito se lo stato e' gia' true
    }

    if (this.timerPronto) { // controllo se esiste gia' un timer di prontezza in corso
      return; // esco subito per non creare un secondo timer
    }

    this.timerPronto = setTimeout(() => { // creo il timer che impostera' lo stato pronto
      this.saturnoPronto$.next(true); // emetto il valore true sul subject di prontezza
      this.timerPronto = null; // azzero il riferimento al timer una volta completato
    }, 50);
  }

  /**
   * Reimposta lo stato di Saturno a non pronto e annulla l'eventuale timer pendente.
   *
   * @returns void
   */
  reset(): void {
    if (this.timerPronto) { // controllo se esiste un timer di prontezza pendente
      clearTimeout(this.timerPronto); // annullo il timer pendente
      this.timerPronto = null; // azzero il riferimento al timer
    }

    if (this.saturnoPronto$.value) { // controllo se lo stato corrente risulta true
      this.saturnoPronto$.next(false); // emetto il valore false sul subject di prontezza
    }
  }
}
