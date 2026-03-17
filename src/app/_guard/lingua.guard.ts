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

 canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
  const url = state.url;
  const match = url.match(/^\/(it|en)(\/|$)/);
  if (!match) return true;

  const langNelUrl = match[1];
  const langSalvata = this.cambioLinguaService.leggiCodiceLingua();

  let urlCorretto = url;

  if (langNelUrl !== langSalvata) {
    urlCorretto = urlCorretto.replace(/^\/(it|en)/, '/' + langSalvata);
  }

urlCorretto = traduciSegmentiUrl(urlCorretto, langSalvata as 'it' | 'en');

  if (urlCorretto === url) return true;

    // separo path e query string prima di costruire il UrlTree
    // così parseUrl non tocca i parametri e non li perde/codifica male
    const [soloPath, queryString] = urlCorretto.split('?');
    const tree = this.router.parseUrl(soloPath);
    if (queryString) {
      const params = new URLSearchParams(queryString);
      params.forEach((value, key) => {
        tree.queryParams[key] = value;
      });
    }
    return tree;
  }
}
