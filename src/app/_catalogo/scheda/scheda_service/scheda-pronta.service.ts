import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

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

  private _playerAperto$ = new BehaviorSubject<boolean>(false);
  playerAperto$ = this._playerAperto$.asObservable();
  impostaPlayerAperto(v: boolean): void { this._playerAperto$.next(v); }

  private _urlScheda$ = new BehaviorSubject<string>('');
  urlScheda$ = this._urlScheda$.asObservable();
  impostaUrlScheda(url: string): void { this._urlScheda$.next(url); }

  private _chiudiPlayer$ = new Subject<void>();
  chiudiPlayer$ = this._chiudiPlayer$.asObservable();
  richiediChiusuraPlayer(): void { this._chiudiPlayer$.next(); }

}
