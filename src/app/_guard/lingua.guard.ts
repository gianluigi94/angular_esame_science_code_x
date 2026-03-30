// Guard che allinea la lingua dell'URL con quella salvata e corregge i segmenti tradotti della rotta.
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { CambioLinguaService } from '../_servizi_globali/cambio-lingua.service';
import { traduciSegmentiUrl } from '../_helpers_globali/helpers';

@Injectable({ providedIn: 'root' })
export class LinguaGuard implements CanActivate {
  constructor(
    private cambioLinguaService: CambioLinguaService,
    private router: Router
  ) {}

  /**
   * Determina se la navigazione puo' proseguire oppure se l'URL
   * deve essere corretto in base alla lingua salvata.
   *
   * Allinea il prefisso lingua e traduce i segmenti della rotta
   * mantenendo intatti gli eventuali query params.
   * @link https://v17.angular.io/guide/router#router-guards
   * @link https://v17.angular.io/api/router/CanDeactivate (forse deprecato, ma funzionante)
   * @param _route Snapshot della rotta richiesta.
   * @param state Stato corrente del router con URL di destinazione.
   * @returns boolean | UrlTree
   */
  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const url = state.url; // leggo l'URL richiesto dal router
    const match = url.match(/^\/(it|en)(\/|$)/); // controllo se l'URL inizia con un prefisso lingua valido
    if (!match) return true; // lascio passare se l'URL non contiene un prefisso lingua gestito

    const langNelUrl = match[1]; // estraggo la lingua presente nell'URL
    const langSalvata = this.cambioLinguaService.leggiCodiceLingua(); // leggo la lingua salvata nello stato globale

    let urlCorretto = url; // preparo una variabile con l'URL eventualmente corretto

    if (langNelUrl !== langSalvata) { // controllo se la lingua dell'URL non coincide con quella salvata
      urlCorretto = urlCorretto.replace(/^\/(it|en)/, '/' + langSalvata); // sostituisco il prefisso lingua con quello corretto
    }

    urlCorretto = traduciSegmentiUrl(urlCorretto, langSalvata as 'it' | 'en'); // traduco i segmenti della rotta in base alla lingua corretta

    if (urlCorretto === url) return true; // lascio proseguire se non ho dovuto correggere nulla

    const [soloPath, queryString] = urlCorretto.split('?'); // separo il path puro dalla query string prima di costruire il redirect
    const tree = this.router.parseUrl(soloPath); // costruisco l'UrlTree usando solo il path
    if (queryString) { // controllo se esistono query params da preservare
      const params = new URLSearchParams(queryString); // converto la query string in parametri leggibili
      params.forEach((value, key) => { // scorro tutti i parametri trovati
        tree.queryParams[key] = value; // ricopio ogni parametro dentro l'UrlTree finale
      });
    }
    return tree; // restituisco il redirect corretto mantenendo anche i query params
  }
}
