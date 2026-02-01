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
        const linguaUtente = localStorage.getItem('lingua_utente') || '';
    const codice = linguaUtente === 'italiano' ? 'it' : 'en';
        const prefisso = codice === 'it' ? '/it' : '/en';
    const baseBenvenuto = prefisso + (codice === 'it' ? '/benvenuto' : '/welcome');
    const baseCatalogo = prefisso + (codice === 'it' ? '/catalogo' : '/catalog');

        const path = String(url || '').split('?')[0].split('#')[0];
        const eBenvenuto = path.startsWith('/it/benvenuto') || path.startsWith('/en/benvenuto');
    const eWelcome = path.startsWith('/it/welcome') || path.startsWith('/en/welcome');
    const eAreaWelcome = eBenvenuto || eWelcome;


        const eRootLingua = path === '/it' || path === '/it/' || path === '/en' || path === '/en/';

    const eAreaCatalogo = path.startsWith('/it/catalogo') || path.startsWith('/en/catalogo') || path.startsWith('/it/catalog') || path.startsWith('/en/catalog');

    const correggiWelcomeCoerente = (p: string): string => {
      // p atteso: /it/benvenuto/... oppure /en/welcome/...
      const m = p.match(/^\/(it|en)\/(benvenuto|welcome)(\/.*)?$/);
      if (!m) return baseBenvenuto;

      let tail = m[3] || '';
      tail = tail.replace(/^\/(login|accedi)(\/|$)/, (mm, _leaf, slash) => {
        const leaf = codice === 'it' ? 'accedi' : 'login';
        return '/' + leaf + (slash || '');
      });
      const target = (baseBenvenuto + tail).replace(/\/+$/,'') || baseBenvenuto;
      return target;
    };

    const correggiCatalogoCoerente = (p: string): string => {
      // mantengo la sotto-rotta (es: /series) ma allineo prefisso + base (catalogo/catalog)
      const m = p.match(/^\/(it|en)\/(catalogo|catalog)(\/.*)?$/);
      if (!m) return baseCatalogo;
      const tail = m[3] || '';
      const target = (baseCatalogo + tail).replace(/\/+$/,'') || baseCatalogo;
      return target;
    };

    if (autenticato) {

      if (url === '/' || url === '' || eRootLingua || eAreaWelcome) {
        return this.router.parseUrl(baseCatalogo);
      }

      // se sono in catalogo ma con prefisso/base non coerenti, correggo
      if (eAreaCatalogo && !path.startsWith(baseCatalogo)) {
        return this.router.parseUrl(correggiCatalogoCoerente(path));
      }

      return true; // per tutte le altre pagine permetto la navigazione
    } else {
          if (eAreaCatalogo) return this.router.parseUrl(baseBenvenuto);
      if (url === '/' || url === '' || eRootLingua) return this.router.parseUrl(baseBenvenuto);



      // 🔹 se sono nella welcome area ma con base NON coerente con la lingua, correggo
    if (eAreaWelcome && !path.startsWith(baseBenvenuto)) return this.router.parseUrl(correggiWelcomeCoerente(path));
      return true; // negli altri casi lascio proseguire la navigazione
    }
  }
}
