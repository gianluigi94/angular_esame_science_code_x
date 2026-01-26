// Interceptor HTTP che intercetta gli errori 'generici' delle chiamate e li inoltra al gestore globale, lasciando fuori login/logout e gli errori di autorizzazione gestiti altrove.

import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErroreGlobaleService } from 'src/app/_servizi_globali/errore-globale.service';

@Injectable() // dichiaro che può essere gestita dalle iniezioni
export class ErroreHttpInterceptor implements HttpInterceptor {
  constructor(private erroreGlobaleService: ErroreGlobaleService) {}

    /**
   * Intercetta ogni richiesta HTTP in uscita per gestire in modo centralizzato
   * gli errori generici di backend o di rete.
   *
   *
   * @link https://angular.dev/guide/http/interceptors
   * @link https://angular.dev/api/common/http/HttpErrorResponse
   *
   * @param req Richiesta HTTP originale.
   * @param next Handler che inoltra la richiesta al backend.
   * @returns Observable del flusso di eventi HTTP.
   */
  intercept(
    // intercetto ogni richiesta in uscita per poter gestire gli errori in modo uniforme
    req: HttpRequest<any>, // ricevo la richiesta originale così posso leggerne URL e dettagli
    next: HttpHandler // ricevo il gestore successivo a cui inoltrare la richiesta
  ): Observable<HttpEvent<any>> {
    // dichiaro che restituisco un flusso di eventi HTTP
    return next.handle(req).pipe(
      // inoltro la richiesta e aggancio la gestione degli errori alla risposta
      catchError((err: HttpErrorResponse) => {
        // catturo eventuali errori HTTP generati dalla chiamata
        if (req.url.includes('/accedi') || req.url.includes('/logout')) { // evito di intervenire sulle chiamate di accesso e uscita
          return throwError(() => err); // rilancio l'errore senza modificarlo
        }

        if (err.status === 401 || err.status === 403) {
          // lascio che gli errori di autorizzazione vengano gestiti altrove
          return throwError(() => err); // rilancio l'errore così com'è
        }

        const msgBackend = // preparo un messaggio di errore leggibile partendo dalla risposta del backend
          (err?.error as any)?.message || // uso il messaggio del backend se presente
          (typeof err?.error === 'string' ? err.error : null) || // uso l'errore testuale se arriva come stringa
          err.message || // altrimenti uso il messaggio generico dell'errore HTTP
          'Errore sconosciuto'; // fornisco un valore di fallback se non ho nessun messaggio

        this.erroreGlobaleService.segnalaErroreServer(msgBackend); // segnalo l'errore come bloccante al gestore globale

        return throwError(() => err); // rilancio l'errore per non interrompere il flusso standard
      })
    );
  }
}
