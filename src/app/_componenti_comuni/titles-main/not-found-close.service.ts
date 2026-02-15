import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotFoundCloseService {
  private readonly _close404$ = new Subject<void>();
  readonly close404$ = this._close404$.asObservable();

  requestClose(): void {
    this._close404$.next();
  }
}
