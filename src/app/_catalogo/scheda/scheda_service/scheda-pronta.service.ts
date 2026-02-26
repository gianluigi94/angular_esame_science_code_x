import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SchedaProntaService {
  private _pronta$ = new BehaviorSubject<boolean>(true); // true di default: non blocca le altre rotte
  schedaPronta$ = this._pronta$.asObservable();

  reset(): void { this._pronta$.next(false); }   // scheda si sta caricando
  segnaPronte(): void { this._pronta$.next(true); } // scheda è pronta
}
