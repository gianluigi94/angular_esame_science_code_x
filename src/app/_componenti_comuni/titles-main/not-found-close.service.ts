import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotFoundCloseService {
  private readonly _close404$ = new Subject<boolean>();
readonly close404$ = this._close404$.asObservable();

requestClose(reload: boolean = false): void {
    this._close404$.next(reload);
}
}
