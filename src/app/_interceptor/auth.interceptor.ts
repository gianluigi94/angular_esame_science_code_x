// Interceptor HTTP che aggiunge automaticamente il token alle richieste e centralizza la gestione degli errori di autenticazione, aggiornando lo stato di sessione e forzando logout/reload quando necessario.

import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpResponse} from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { Authservice } from '../_benvenuto/login/_login_service/auth.service';
import { Router } from '@angular/router';
import { ErroreGlobaleService } from '../_servizi_globali/errore-globale.service';
import { StatoSessioneClientService } from '../_servizi_globali/stato-sessione-client.service';

@Injectable() // dichiaro che può essere gestita dalle iniezioni
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: Authservice,
    private router: Router,
    private erroreGlobale: ErroreGlobaleService,
    private statoSessione: StatoSessioneClientService,
  ) {}

  /**
   * Intercetta ogni richiesta HTTP in uscita.
   *
   * Responsabilità principali:
   * - clonare la request aggiungendo l'header Authorization quando necessario
   * - confermare la sessione alla prima risposta valida con Bearer
   * - intercettare errori di autenticazione e gestire logout/reload
   * - delegare al componente login la gestione degli errori di accesso
   *
   * @link https://angular.dev/guide/http/interceptors
   * @link https://angular.dev/api/common/http/HttpRequest
   *
   * @param req Richiesta HTTP originale
   * @param next Handler che inoltra la richiesta al backend
   * @returns Observable del flusso di eventi HTTP
   */
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    // intercetto ogni richiesta in uscita e restituisco un flusso di eventi HTTP

    let reqDaUsare = req; // parto dalla richiesta originale e preparo una variabile che eventualmente modificherò

    // niente bearer sulle chiamate /accedi e /traduzioni-lingua
    if (
      !req.url.includes('/accedi') &&
      !req.url.includes('/traduzioni-lingua') &&
      !req.url.match(/\/categorie(\/|$|\?)/) &&
      !req.url.match(/\/categorie-traduzioni(\/|$|\?)/)
    ) {
      // applico il token solo se la chiamata non è di accesso e non è per le traduzioni
      const auth = this.authService.leggiAuthDaStorage(); // leggo auth da localStorage (collegato) o sessionStorage (non collegato)
      const tk = auth?.tk; // estraggo il token se presente

      if (tk) {
        // continuo solo se ho davvero un token valido
        reqDaUsare = req.clone({
          // creo una copia della richiesta aggiungendo le intestazioni necessarie
          setHeaders: {
            // imposto le intestazioni da aggiungere o sovrascrivere
            Authorization: `Bearer ${tk}`, // inserisco il token come autorizzazione in formato bearer
          },
        });
      }
    }

    return next.handle(reqDaUsare).pipe(
      // inoltro la richiesta (originale o clonata) e mi aggancio alla risposta tramite una catena di operatori

      tap({
        // ascolto gli eventi senza modificarli, solo per eseguire effetti collaterali
        next: (event) => {
          // gestisco l'evento di successo che arriva dal flusso
          if (event instanceof HttpResponse && !req.url.includes('/accedi')) {
            // reagisco solo alle risposte complete e ignoro quelle del login

            const now = performance.now();
            console.log(
              '[INTERCEPT] RISPOSTA ' +
                event.status +
                ' | ' +
                req.url +
                ' | @' + now.toFixed(0) + ' ms',
            );

            const haTokenIniziale = this.statoSessione.haTokenIniziale; // verifico se all'avvio avevo già un token salvato
            const richiestaConBearer = reqDaUsare.headers.has('Authorization'); // controllo se questa richiesta è partita con l'intestazione di autorizzazione

            const suRottaPiano = /^\/(it\/piano|en\/plan)(\/|$)/.test(window.location.pathname);
            const suRottaRicevute = /^\/(it\/ricevute|en\/receipts)(\/|$)/.test(window.location.pathname);
            const suRottaProfilo = /^\/(it\/profilo|en\/profile)(\/|$)/.test(window.location.pathname);
            if (!haTokenIniziale || suRottaPiano || suRottaRicevute || suRottaProfilo) {
              this.statoSessione.segnaSessioneVerificata();
            } else {
              if (richiestaConBearer) {
                this.statoSessione.sessioneGiaConfermata = true;
                this.statoSessione.segnaSessioneVerificata();
              }
            }
          }
        },
      }),

      catchError((err: HttpErrorResponse) => {
        // intercetto gli errori HTTP per gestirli in modo centralizzato
        const rawMsg = // preparo un messaggio grezzo leggibile da usare nelle decisioni successive
          (err?.error as any)?.message || // prendo il campo message se l'errore è un oggetto con message
          (typeof err?.error === 'string' ? err.error : '') || // se l'errore è una stringa, uso direttamente quella
          err.message || // altrimenti ripiego sul messaggio standard dell'errore
          ''; // se non ho nulla, mi assicuro di avere almeno una stringa vuota

        // login: il componente se la gestisce da solo
       if (req.url.includes('/accedi') || req.url.includes('/verifica-credenziali')) {
          return throwError(() => err);
        }
        const msgLower = (rawMsg || '').toLowerCase(); // porto il messaggio in minuscolo per fare controlli senza problemi
        const eTokenScadutoMascheratoDa500 = // preparo un flag per riconoscere un token scaduto anche quando torna come errore 500
          err.status === 500 &&
          (msgLower.includes('expired token') ||
            msgLower.includes('token scaduto')); // considero il caso 500 valido se nel testo trovo indizi di token scaduto

        // gestione sessione (unica fonte di verità)
        if (
          err.status === 401 ||
          err.status === 403 ||
          eTokenScadutoMascheratoDa500
        ) {
          // entro qui se l'errore indica problemi di autorizzazione o token scaduto

          const haTokenIniziale = this.statoSessione.haTokenIniziale; // recupero se all'avvio esisteva già un token
          const giaConfermata = this.statoSessione.sessioneGiaConfermata; // recupero se la sessione era già stata confermata con una chiamata riuscita

          // CASO A: token morto all'ingresso
          const deveEssereTrattatoComeIniziale =
            haTokenIniziale && !giaConfermata; // decido che è un token 'morto all'ingresso' se c'era ma non ha mai passato una chiamata con bearer

          if (deveEssereTrattatoComeIniziale) {
            this.authService.logout(false);

            const urlCorrente = window.location.search;
            if (urlCorrente.includes('cambio_email=ok')) {
              localStorage.setItem('cambio_email_pending', 'ok');
            } else if (urlCorrente.includes('cambio_email=scaduto') || urlCorrente.includes('cambio_email=errore')) {
              localStorage.setItem('cambio_email_pending', 'errore');
            } else {
              localStorage.setItem('toast_benvenuto', 'true');
            }

            if (!this.statoSessione.staRicaricando) {
              this.statoSessione.staRicaricando = true;
              this.erroreGlobale.resettaErroreFatale();
              window.location.reload();
            }
          } else {
            // entro qui se la sessione era valida e poi è scaduta durante l'uso

            // CASO B: token scaduto mentre ero dentro → pagina bloccante + toast giallo
            this.authService.logout(true); // eseguo il logout mostrando la gestione 'bloccante' della sessione scaduta

            let codiceSessione: string = 'GENERICA'; // imposto un codice predefinito nel caso non riconosca il motivo preciso

            // inattivita' rimossa lato backend: non la gestisco piu' qui
            if (rawMsg.includes('SESSIONE COLLEGATO SCADUTA')) {
              codiceSessione = 'COLLEGATO';
            } else if (rawMsg.includes('TOKEN SCADUTO')) {
              codiceSessione = 'COLLEGATO';
            }

            this.erroreGlobale.segnalaErroreSessione(codiceSessione); // notifico al gestore globale l'errore di sessione con il codice scelto
          }
        }

        // gli errori server 500 / rete / ecc. li gestisce ErroreHttpInterceptor
        return throwError(() => err); // rilancio comunque l'errore perché altri interceptor o chiamanti possano gestirlo
      }),
    );
  }
}
