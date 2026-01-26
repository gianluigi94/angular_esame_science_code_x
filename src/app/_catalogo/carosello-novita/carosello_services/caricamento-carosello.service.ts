// Servizio che centralizza la 'prontezza' del carosello: riceve segnali da più parti del caricamento e notifica quando tutto è pronto.

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })// Registro il servizio nel root injector
export class CaricamentoCaroselloService {
  caroselloPronto$ = new BehaviorSubject<boolean>(false); // espongo uno stato reattivo che dice se il carosello e' pronto

  sfondiPronti = false; // flag interno per sapere se gli sfondi sono stati caricati
  titoliPronti = false; // flag interno per sapere se i titoli sono stati caricati

/**
 * Riporta il servizio allo stato iniziale di caricamento.
 *
 * Azzera i flag interni di readiness (sfondi e titoli) e notifica
 * che il carosello non e' pronto tramite 'caroselloPronto$'.
 *
 * @returns void
 */
  resetta(): void {
    // preparo una funzione per riportare il servizio allo stato iniziale
    this.sfondiPronti = false; // azzero lo stato degli sfondi
    this.titoliPronti = false; // azzero lo stato dei titoli
    this.caroselloPronto$.next(false); // notifico a tutti che il carosello non e' pronto
  }

  /**
 * Segnala che gli sfondi del carosello sono pronti.
 *
 * Imposta il flag interno e verifica se anche i titoli sono pronti
 * per poter notificare lo stato finale di prontezza.
 *
 * @returns void
 */
  segnalaSfondiPronti(): void {
    // funzione da chiamare quando gli sfondi hanno finito di caricarsi
    this.sfondiPronti = true; // segno che gli sfondi sono pronti
    this.verificaPronto(); // controllo se a questo punto anche il resto e' pronto
  }

  /**
 * Segnala che i titoli del carosello sono pronti.
 *
 * Imposta il flag interno e verifica se anche gli sfondi sono pronti
 * per poter notificare lo stato finale di prontezza.
 *
 * @returns void
 */
  segnalaTitoliPronti(): void {
    // funzione da chiamare quando i titoli hanno finito di caricarsi
    this.titoliPronti = true; // segno che i titoli sono pronti
    this.verificaPronto(); // controllo se a questo punto anche il resto e' pronto
  }

  /**
 * Verifica se il carosello puo' essere considerato pronto.
 *
 * Se sia sfondi che titoli risultano pronti, notifica 'true' su 'caroselloPronto$'.
 *
 * @returns void
 */
  verificaPronto(): void {
    // funzione che decide quando il carosello puo' essere considerato pronto
    if (this.sfondiPronti && this.titoliPronti) {
      // verifico che entrambe le parti necessarie siano pronte
      this.caroselloPronto$.next(true); // notifico a tutti che il carosello e' pronto
    }
  }
}
