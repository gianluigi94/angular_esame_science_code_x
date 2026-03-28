import { Injectable } from '@angular/core';
import { Observable, ReplaySubject, BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ScorrimentoCatalogoService {
  richiesteSoggetto = new ReplaySubject<string>(1);
  richieste$: Observable<string> = this.richiesteSoggetto.asObservable();
    spinnerScrollSoggetto = new BehaviorSubject<boolean>(false);
  spinnerScroll$: Observable<boolean> = this.spinnerScrollSoggetto.asObservable();
  richiediScroll(idCategoria: string): void {
    const id = String(idCategoria || '').trim();
    if (!id) return;
    this.richiesteSoggetto.next(id);
  }

    impostaSpinnerScroll(val: boolean): void {
    this.spinnerScrollSoggetto.next(!!val);
  }
}
