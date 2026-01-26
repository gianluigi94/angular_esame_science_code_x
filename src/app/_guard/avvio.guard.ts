// Guard che decide il reindirizzamento iniziale in base allo stato di autenticazione.

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { Authservice } from '../_benvenuto/login/_login_service/auth.service';

@Injectable({ providedIn: 'root'})// Dico ad Angular che questa classe è un servizio iniettabile
export class AvvioGuard implements CanActivate { //(forse deprecato, ma funzionante. devo informarmi)
  private static haGiaLoggatoStato = false; // mi tengo un flag condiviso per stampare lo stato di login una sola volta

  constructor(private authService: Authservice, private router: Router) {} // mi inietto il servizio di autenticazione e il router per poter decidere i reindirizzamenti

   /**
   * Determina se una rotta può essere attivata o se è necessario
   * effettuare un reindirizzamento.
   *
   * - utenti autenticati:
   *   - '/' o '/benvenuto' → redirect a '/catalogo'
   * - utenti non autenticati:
   *   - '/catalogo' → redirect a '/benvenuto'
   *   - '/' → redirect a '/benvenuto'
   *
   * Negli altri casi la navigazione è consentita.
   *
   * @link https://v17.angular.io/guide/router#router-guards
   * @link https://v17.angular.io/api/router/CanDeactivate (forse deprecato, ma funzionante. devo informarmi)
   *
   * @param route Snapshot della rotta richiesta.
   * @param state Stato corrente del router con URL di destinazione.
   * @returns true se la navigazione è consentita, oppure UrlTree per il redirect.
   */
  canActivate(
    // decido se permettere o bloccare l'accesso a una rotta
    route: ActivatedRouteSnapshot, // ricevo le informazioni sulla rotta richiesta
    state: RouterStateSnapshot // ricevo lo stato di navigazione, incluso l'URL di destinazione
  ): boolean | UrlTree | Observable<boolean | UrlTree> {
    // dichiaro che posso restituire un sì/no, un reindirizzamento o un risultato asincrono

    const auth = this.authService.leggiObsAuth().value; // leggo lo stato attuale di autenticazione dal mio observable
    const autenticato = auth && auth.tk !== null; // considero autenticato chi ha un oggetto auth e un token non nullo

    if (!AvvioGuard.haGiaLoggatoStato) {
      // controllo se non ho ancora stampato lo stato di login
      AvvioGuard.haGiaLoggatoStato = true; // segno che da ora in poi non devo più ristampare questa informazione
      console.log('FRONT END LOGGATO: ' + (autenticato ? 'trsue' : 'faslse'));
    }

    const url = state.url; // salvo l'URL richiesto per usarlo nelle regole di accesso

    if (autenticato) {
      // entro qui se risulto già autenticato
      if (url === '/' || url === '' || url.startsWith('/benvenuto')) {
        // se sto andando alla home vuota o alle pagine di benvenuto, non mi serve restarci
        return this.router.parseUrl('/catalogo'); // reindirizzo direttamente al catalogo
      }
      return true; // per tutte le altre pagine permetto la navigazione
    } else {
      // entro qui se non sono autenticato
      if (url.startsWith('/catalogo')) {
        // se provo ad andare nel catalogo senza login
        return this.router.parseUrl('/benvenuto'); // mi rimando alla pagina di benvenuto
      }
      if (url === '/' || url === '') {
        // se qualcuno apre a mano la root vuota
        return this.router.parseUrl('/benvenuto'); // lo porto comunque al benvenuto
      }
      return true; // negli altri casi lascio proseguire la navigazione
    }
  }
}
