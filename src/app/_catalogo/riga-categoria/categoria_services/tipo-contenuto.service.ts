// Servizio che gestisce il tipo di contenuto selezionato e notifica le fasi del cambio tipo.

import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export type TipoContenuto = 'film_serie' | 'film' | 'serie';

@Injectable({ providedIn: 'root' })
export class TipoContenutoService {
  chiaveStorage = 'tipo_contenuto_selezionato'; // tengo la chiave usata nel localStorage
  tipoSelezionato$ = new BehaviorSubject<TipoContenuto>(this.leggiDaStorage()); // espongo il tipo attualmente selezionato
  cambioTipoAvviato$ = new Subject<{ tipo: TipoContenuto; id: number }>(); // notifico quando il cambio tipo parte
  cambioTipoApplicato$ = new Subject<{ tipo: TipoContenuto; id: number }>(); // notifico quando il cambio tipo e' stato applicato

  /**
   * Salva e pubblica il nuovo tipo di contenuto selezionato.
   *
   * @param tipo Tipo di contenuto da impostare.
   * @returns void
   */
  impostaTipo(tipo: TipoContenuto): void {
    localStorage.setItem(this.chiaveStorage, tipo); // salvo il tipo selezionato nel localStorage
    this.tipoSelezionato$.next(tipo); // pubblico il nuovo tipo selezionato
  }

  /**
   * Restituisce il tipo di contenuto attualmente selezionato.
   *
   * @returns TipoContenuto Tipo di contenuto corrente.
   */
  leggiTipo(): TipoContenuto {
    return this.tipoSelezionato$.value; // restituisco il valore corrente del BehaviorSubject
  }

  /**
   * Legge il tipo di contenuto dal localStorage.
   *
   * @returns TipoContenuto Tipo salvato se valido, altrimenti il fallback predefinito.
   */
  leggiDaStorage(): TipoContenuto {
    const raw = String(localStorage.getItem(this.chiaveStorage) || ''); // leggo il valore grezzo dal localStorage
    if (raw === 'film' || raw === 'serie' || raw === 'film_serie') return raw; // restituisco il valore solo se e' valido
    return 'film_serie'; // faccio fallback sul tipo predefinito
  }

  /**
   * Notifica l'avvio del cambio tipo.
   *
   * @param tipo Tipo verso cui sto cambiando.
   * @param id Id del ciclo di cambio tipo.
   * @returns void
   */
  notificaCambioTipoAvviato(tipo: TipoContenuto, id: number): void {
    this.cambioTipoAvviato$.next({ tipo, id }); // pubblico l'evento di avvio del cambio tipo
  }

  /**
   * Notifica che il cambio tipo e' stato applicato.
   *
   * @param tipo Tipo che e' stato applicato.
   * @param id Id del ciclo di cambio tipo.
   * @returns void
   */
  notificaCambioTipoApplicato(tipo: TipoContenuto, id: number): void {
    this.cambioTipoApplicato$.next({ tipo, id }); // pubblico l'evento di applicazione del cambio tipo
  }
}
