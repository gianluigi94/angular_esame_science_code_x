// Guard che gestisce il reindirizzamento iniziale in base allo stato di autenticazione e alla lingua.
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import { Observable } from 'rxjs';
import { Authservice } from '../_benvenuto/login/_login_service/auth.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';

@Injectable({ providedIn: 'root' })
export class AvvioGuard implements CanActivate {
  private static haGiaLoggatoStato = false; // mi tengo un flag condiviso per stampare lo stato di login una sola volta

  constructor(
    private authService: Authservice,
    private router: Router,
    private cambioLingua: CambioLinguaService,
  ) {}

  /**
   * Determina se una rotta puo' essere attivata o se e' necessario
   * effettuare un reindirizzamento.
   *
   * Gestisce autenticazione, lingua URL, lingua salvata e coerenza
   * dei path tra area welcome e area catalogo.
   * @link https://v17.angular.io/guide/router#router-guards
   * @link https://v17.angular.io/api/router/CanDeactivate (forse deprecato, ma funzionante)
   * @param route Snapshot della rotta richiesta.
   * @param state Stato corrente del router con URL di destinazione.
   * @returns boolean | UrlTree | Observable<boolean | UrlTree>
   */
  canActivate(
    route: ActivatedRouteSnapshot, // ricevo le informazioni sulla rotta richiesta
    state: RouterStateSnapshot, // ricevo lo stato di navigazione con l'URL di destinazione
  ): boolean | UrlTree | Observable<boolean | UrlTree> {
    const auth = this.authService.leggiObsAuth().value; // leggo lo stato attuale di autenticazione
    const autenticato = auth && auth.tk !== null; // considero autenticato chi ha un token non nullo

    if (!AvvioGuard.haGiaLoggatoStato) { // controllo se non ho ancora stampato lo stato auth
      AvvioGuard.haGiaLoggatoStato = true; // segno che non devo piu' ristampare questa informazione
      console.log('FRONT END LOGGATO: ' + (autenticato ? 'trsue' : 'faslse')); // stampo una sola volta lo stato di login
    }

    const url = state.url || ''; // leggo l'URL richiesto o uso stringa vuota
    const linguaDaUrl = String(route.paramMap.get('lingua') || '') // leggo il parametro lingua dalla route
      .toLowerCase() // normalizzo in minuscolo
      .trim(); // rimuovo eventuali spazi
    const salvata = localStorage.getItem('lingua_utente') || ''; // leggo la lingua salvata in localStorage
    const codiceDaStorage =
      salvata === 'italiano' ? 'it' : salvata === 'inglese' ? 'en' : ''; // converto la lingua salvata in codice
    const linguaUrlValida = linguaDaUrl === 'it' || linguaDaUrl === 'en'; // verifico se la lingua nell'URL e' valida
    const codice = linguaUrlValida
      ? linguaDaUrl // uso la lingua dell'URL se valida
      : codiceDaStorage || this.codiceDaBrowser(); // altrimenti uso storage o browser

    const prefisso = codice === 'it' ? '/it' : '/en'; // costruisco il prefisso lingua coerente

    this.cambioLingua.impostaLinguaDaCodice(codice, linguaUrlValida); // allineo lo stato globale della lingua
    const baseBenvenuto =
      prefisso + (codice === 'it' ? '/benvenuto' : '/welcome'); // costruisco la base dell'area welcome
    const baseCatalogo =
      prefisso + (codice === 'it' ? '/catalogo' : '/catalog'); // costruisco la base dell'area catalogo

    const path = String(url || '') // normalizzo l'URL in stringa
      .split('?')[0] // rimuovo la query string
      .split('#')[0]; // rimuovo il fragment
    const eBenvenuto = path.startsWith('/' + codice + '/benvenuto'); // controllo se il path e' nell'area benvenuto
    const eWelcome = path.startsWith('/' + codice + '/welcome'); // controllo se il path e' nell'area welcome
    const eAreaWelcome = eBenvenuto || eWelcome; // unisco i due controlli per l'area welcome

    const eRootLingua =
      path === '/it' || path === '/it/' || path === '/en' || path === '/en/'; // controllo se sono sulla root lingua

    const eAreaCatalogo =
      path.startsWith('/it/catalogo') ||
      path.startsWith('/en/catalogo') ||
      path.startsWith('/it/catalog') ||
      path.startsWith('/en/catalog'); // controllo se sono nell'area catalogo

    /**
     * Corregge un path dell'area welcome rendendolo coerente con la lingua attiva.
     *
     * Mantiene l'eventuale sotto-rotta finale e riallinea il segmento
     * login/accedi alla lingua corrente.
     *
     * @param p Path da correggere.
     * @returns string Il path welcome coerente.
     */
    const correggiWelcomeCoerente = (p: string): string => {
      const m = p.match(/^\/(it|en)\/(benvenuto|welcome)(\/.*)?$/); // verifico se il path appartiene all'area welcome
      if (!m) return baseBenvenuto; // torno alla base welcome se il path non combacia

      let tail = m[3] || ''; // estraggo l'eventuale parte finale del path
      tail = tail.replace(/^\/(login|accedi)(\/|$)/, (mm, _leaf, slash) => { // correggo il segmento login/accedi in base alla lingua
        const leaf = codice === 'it' ? 'accedi' : 'login'; // scelgo il segmento coerente con la lingua
        return '/' + leaf + (slash || ''); // ricostruisco la parte finale corretta
      });
      const target =
        (baseBenvenuto + tail).replace(/\/+$/, '') || baseBenvenuto; // costruisco il target finale ripulendo gli slash finali
      return target; // restituisco il path corretto
    };

    /**
     * Corregge un path dell'area catalogo rendendolo coerente con la lingua attiva.
     *
     * Mantiene l'eventuale sotto-rotta finale e riallinea
     * la base catalogo/catalog alla lingua corrente.
     *
     * @param p Path da correggere.
     * @returns string Il path catalogo coerente.
     */
    const correggiCatalogoCoerente = (p: string): string => {
      const m = p.match(/^\/(it|en)\/(catalogo|catalog)(\/.*)?$/); // verifico se il path appartiene all'area catalogo
      if (!m) return baseCatalogo; // torno alla base catalogo se il path non combacia
      const tail = m[3] || ''; // estraggo l'eventuale parte finale del path
      const target = (baseCatalogo + tail).replace(/\/+$/, '') || baseCatalogo; // costruisco il target finale ripulendo gli slash finali
      return target; // restituisco il path corretto
    };

    if (autenticato) { // controllo il ramo degli utenti autenticati
      if (url === '/' || url === '' || eRootLingua || eAreaWelcome) { // verifico se devo mandarli direttamente al catalogo
        return this.router.parseUrl(baseCatalogo); // reindirizzo al catalogo coerente con la lingua
      }

      if (eAreaCatalogo && !path.startsWith(baseCatalogo)) { // controllo se il catalogo ha base o prefisso non coerenti
        return this.router.parseUrl(correggiCatalogoCoerente(path)); // correggo il path del catalogo
      }

      return true; // negli altri casi permetto la navigazione
    } else { // entro nel ramo degli utenti non autenticati
      if (eAreaCatalogo) return this.router.parseUrl(baseBenvenuto); // blocco l'accesso al catalogo e mando alla welcome
      if (url === '/' || url === '' || eRootLingua)
        return this.router.parseUrl(baseBenvenuto); // mando alla welcome anche root e root lingua

      if (eAreaWelcome && !path.startsWith(baseBenvenuto))
        return this.router.parseUrl(correggiWelcomeCoerente(path)); // correggo la welcome se non coerente con la lingua
      return true; // negli altri casi lascio proseguire la navigazione
    }
  }

  /**
   * Determina il codice lingua a partire dalla configurazione del browser.
   *
   * Considera italiana qualsiasi lingua primaria uguale a 'it'
   * o che inizi con 'it-'; in tutti gli altri casi usa 'en'.
   *
   * @returns string Il codice lingua ricavato dal browser.
   */
  codiceDaBrowser(): string {
    const primaria = (navigator.languages?.[0] || navigator.language || '') // leggo la lingua primaria del browser
      .toLowerCase() // normalizzo in minuscolo
      .trim(); // rimuovo eventuali spazi
    return primaria === 'it' || primaria.startsWith('it-') ? 'it' : 'en'; // restituisco il codice lingua coerente
  }
}
