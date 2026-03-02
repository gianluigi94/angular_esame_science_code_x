import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SchedaProntaService {
  private _pronta$ = new BehaviorSubject<boolean>(true);
  schedaPronta$ = this._pronta$.asObservable();

  loaderGlobalmenteNascosto = false; // ← AGGIUNTO: flag persistente, non si resetta mai

  reset(): void { this._pronta$.next(false); }
  segnaPronte(): void { this._pronta$.next(true); }
}
