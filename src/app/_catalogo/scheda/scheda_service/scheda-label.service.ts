// Servizio che espone e aggiorna la label usata per tornare al catalogo.

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SchedaLabelService {
  private _labelTornaCatalogo = new BehaviorSubject<string>(''); // tengo il valore corrente della label torna catalogo
  labelTornaCatalogo$ = this._labelTornaCatalogo.asObservable(); // espongo lo stream osservabile della label

  /**
   * Aggiorna la label usata per tornare al catalogo.
   *
   * @param label Testo da pubblicare come label corrente.
   * @returns void
   */
  imposta(label: string): void {
    this._labelTornaCatalogo.next(label); // pubblico la nuova label torna catalogo
  }
}
