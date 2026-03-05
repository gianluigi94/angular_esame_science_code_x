import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SchedaProntaService {
  private _pronta$ = new BehaviorSubject<boolean>(true);
  schedaPronta$ = this._pronta$.asObservable();
  loaderGlobalmenteNascosto = false;

  private _labelTorna$ = new BehaviorSubject<string>('');
  labelTorna$ = this._labelTorna$.asObservable();
  impostaLabelTorna(label: string): void { this._labelTorna$.next(label); }

  reset(): void { this._pronta$.next(false); }
  segnaPronte(): void { this._pronta$.next(true); }
}
