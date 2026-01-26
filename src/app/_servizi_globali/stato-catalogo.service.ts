// breve servizio che mi serve per decidere se il catalogo è pronto, utile per togliere loader e iniziare animazioni nel momento giusto
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' }) // Registro il servizio nel root injector così lo uso ovunque come singleton
export class StatoCatalogoService { // Creo il servizio che mantiene lo stato del catalogo
  inCatalogo$ = new BehaviorSubject<boolean>(false); // Tengo lo stato 'sono nel catalogo' e parto da false
  catalogoPronto$ = new BehaviorSubject<boolean>(true); // Tengo lo stato 'catalogo pronto' e parto da true
/**
 * Segna che l'utente è entrato nel catalogo e che il catalogo non è ancora pronto.
 *
 * Da chiamare all'ingresso nell'area catalogo per:
 * - impostare 'inCatalogo$' a true
 * - impostare 'catalogoPronto$' a false (finché non arriva 'segnalaPronto')
 *
 * @returns void
 */
  entraInCatalogo(): void {
    this.inCatalogo$.next(true); // Segno che ora sono nel catalogo
    this.catalogoPronto$.next(false); // Segno che il catalogo deve ancora diventare pronto
  }

  /**
 * Segna che l'utente è uscito dal catalogo e ripristina lo stato di prontezza.
 *
 * Da chiamare quando si lascia l'area catalogo per:
 * - impostare 'inCatalogo$' a false
 * - impostare 'catalogoPronto$' a true (fuori dal catalogo non serve attendere caricamenti)
 *
 * @returns void
 */
  esciDaCatalogo(): void { // Creo un metodo da chiamare quando esco dal catalogo
    this.inCatalogo$.next(false); // Segno che non sono più nel catalogo
    this.catalogoPronto$.next(true); // Segno che fuori dal catalogo sono 'pronto'
  }

  /**
 * Segnala che il catalogo ha completato il caricamento ed è pronto.
 *
 * Imposta 'catalogoPronto$' a true, così la UI può nascondere il loader e avviare le animazioni.
 *
 * @returns void
 */
  segnalaPronto(): void { // Creo un metodo da chiamare quando il catalogo ha finito di caricarsi
    this.catalogoPronto$.next(true); // Segno che il catalogo è pronto
  }
}
