// Servizio che emette una richiesta di chiusura della schermata 404.
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotFoundCloseService {
  private readonly _close404$ = new Subject<boolean>(); // tengo il subject interno che emette la richiesta di chiusura
  readonly close404$ = this._close404$.asObservable(); // espongo solo l'observable della chiusura verso l'esterno

  /**
   * Richiede la chiusura della schermata 404.
   *
   * Propaga anche l'informazione su un eventuale reload
   * da eseguire dopo la chiusura.
   *
   * @param reload True se dopo la chiusura devo ricaricare, false altrimenti.
   * @returns void
   */
  requestClose(reload: boolean = false): void {
    this._close404$.next(reload); // emetto la richiesta di chiusura con il flag di reload
  }
}
