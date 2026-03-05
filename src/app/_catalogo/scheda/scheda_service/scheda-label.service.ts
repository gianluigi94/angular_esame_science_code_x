import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SchedaLabelService {
  private _labelTornaCatalogo = new BehaviorSubject<string>('');
  labelTornaCatalogo$ = this._labelTornaCatalogo.asObservable();

  imposta(label: string): void {
    this._labelTornaCatalogo.next(label);
  }
}
