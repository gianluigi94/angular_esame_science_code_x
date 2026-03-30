// Servizio che notifica richieste di scroll del catalogo e stato dello spinner collegato.

import { Injectable } from '@angular/core';
import { Observable, ReplaySubject, BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ScorrimentoCatalogoService {
  richiesteSoggetto = new ReplaySubject<string>(1); // tengo l'ultima richiesta di scroll emessa
  richieste$: Observable<string> = this.richiesteSoggetto.asObservable(); // espongo lo stream delle richieste di scroll
  spinnerScrollSoggetto = new BehaviorSubject<boolean>(false); // tengo lo stato corrente dello spinner di scroll
  spinnerScroll$: Observable<boolean> = this.spinnerScrollSoggetto.asObservable(); // espongo lo stream dello spinner di scroll

  /**
   * Emette una nuova richiesta di scroll verso una categoria specifica.
   *
   * @param idCategoria Id della categoria da raggiungere.
   * @returns void
   */
  richiediScroll(idCategoria: string): void {
    const id = String(idCategoria || '').trim(); // normalizzo l'id categoria ricevuto
    if (!id) return; // esco se l'id non e' valido
    this.richiesteSoggetto.next(id); // pubblico la nuova richiesta di scroll
  }

  /**
   * Aggiorna lo stato dello spinner usato durante lo scroll del catalogo.
   *
   * @param val Valore booleano da applicare allo spinner.
   * @returns void
   */
  impostaSpinnerScroll(val: boolean): void {
    this.spinnerScrollSoggetto.next(!!val); // pubblico il nuovo stato dello spinner
  }
}
