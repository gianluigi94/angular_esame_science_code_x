import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StatoPagamentoService {
  private _fallito$ = new BehaviorSubject<boolean>(false);
  fallito$ = this._fallito$.asObservable();

  get fallito(): boolean {
    return this._fallito$.value;
  }

  aggiorna(valore: boolean): void {
    this._fallito$.next(valore);
  }
}
