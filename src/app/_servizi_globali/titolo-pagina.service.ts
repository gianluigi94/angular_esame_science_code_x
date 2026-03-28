// servizio dove decido il title da inserire in base alla pagina in cui si trova l'utente
import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CambioLinguaService } from './cambio-lingua.service';
import { TipoContenutoService } from 'src/app/_catalogo/riga-categoria/categoria_services/tipo-contenuto.service';

@Injectable({ providedIn: 'root' }) // Registro il servizio nel root injector
export class TitoloPaginaService {
  constructor(
    private title: Title, // Uso Title per impostare il titolo del browser
    private router: Router, // Uso Router per leggere URL e ascoltare navigazioni
    private tipoContenuto: TipoContenutoService,
    private cambioLinguaService: CambioLinguaService // Uso CambioLinguaService per sapere la lingua corrente
  ) {}

  /**
   * Avvia la logica di aggiornamento del titolo della pagina.
   *
   * Imposta subito il titolo in base all'URL corrente e poi si mette in ascolto:
   * - delle navigazioni del router (NavigationEnd) per aggiornare il titolo a ogni cambio pagina
   * - del cambio lingua applicato, per ricalcolare il titolo nella nuova lingua mantenendo la stessa rotta
   *
   * @returns void
   */
   avvia(): void {
  this.aggiornaTitolo(this.pathInizialePerTitolo());

   this.router.events
     .pipe(filter((ev) => ev instanceof NavigationEnd))
     .subscribe((ev: any) => {
       const url =
         ev && ev.urlAfterRedirects
           ? ev.urlAfterRedirects
           : ev && ev.url
           ? ev.url
           : '';
       this.aggiornaTitolo(url);

           // se entro nel catalogo, riallineo SEMPRE il titolo al tipo corrente (anche se l'URL e' /catalogo)
  const path = this.pulisciUrlSenzaLingua(url);
if (path === '/catalogo' || path === '/catalogo/' || path.startsWith('/catalogo/') ||
    path === '/catalog'  || path === '/catalog/'  || path.startsWith('/catalog/')) {
  this.aggiornaTitolo(this.pathDaTipoCorrente());
}
     });

    this.cambioLinguaService.cambioLinguaApplicata$.subscribe(() => {
  const path = this.pulisciUrlSenzaLingua(this.router.url || '');
if (path === '/non-trovato' || path === '/not-found') {
  this.aggiornaTitolo(this.router.url || '');
  return;
}
if (path === '/catalogo' || path === '/catalogo/' || path.startsWith('/catalogo/') ||
    path === '/catalog'  || path === '/catalog/'  || path.startsWith('/catalog/')) {
  this.aggiornaTitolo(this.pathDaTipoCorrente());
  return;
}
this.aggiornaTitolo(this.router.url || '');
 });


   this.tipoContenuto.tipoSelezionato$.subscribe((tipo) => {
    // aggiorno il titolo solo se sono nel catalogo (altrimenti rischi titoli "sbagliati" in altre pagine)
    const base = this.pulisciUrlSenzaLingua(this.router.url || '');
if (!base.startsWith('/catalogo') && !base.startsWith('/catalog')) return;
     const fintoPath =
       tipo === 'film' ? '/catalogo/film'
       : tipo === 'serie' ? '/catalogo/serie'
       : '/catalogo/film-serie';
     this.aggiornaTitolo(fintoPath);
   });
 }

 pathInizialePerTitolo(): string {
   const path = this.pulisciUrlSenzaLingua(this.router.url || '');
const eCatalogoNudo =
  path === '/catalogo' || path === '/catalogo/' ||
  path === '/catalog'  || path === '/catalog/';
   if (!eCatalogoNudo) return this.router.url || '';

   const tipo = this.tipoContenuto.leggiTipo();
  const base = path.startsWith('/catalog') ? '/catalog' : '/catalogo';
if (tipo === 'film') return base + (base === '/catalog' ? '/movies' : '/film');
if (tipo === 'serie') return base + (base === '/catalog' ? '/series' : '/serie');
return base + (base === '/catalog' ? '/movies-series' : '/film-serie');
 }

 impostaTitoloScheda(titolo: string): void {
    const base = 'ScienceCode X';
    if (titolo) {
      this.title.setTitle(`${titolo} - ${base}`);
    }
  }
  /**
   * Calcola e imposta il titolo del browser in base alla rotta  e alla lingua corrente.
   *
   * Normalizza l'URL rimuovendo query string e hash, poi sceglie un titolo localizzato
   * per le rotte note e infine usa 'Title' di Angular per applicarlo.
   *
   * @param url URL (o path) da cui ricavare la rotta corrente.
   * @returns void
   */
  private aggiornaTitolo(url: string): void {
    const codice = this.cambioLinguaService.leggiCodiceLingua(); // Leggo il codice lingua '
    const path = this.pulisciUrlSenzaLingua(url); // Pulisco l'URL da query e hash

    const base = 'ScienceCode X'; // Definisco il nome base del sito da mettere sempre nel titolo
    let titolo = base; // Imposto un titolo di default
if (
  path === '/benvenuto' || path === '/benvenuto/' ||
  path === '/welcome'   || path === '/welcome/'
) {
  titolo = codice === 'it' ? `Benvenuto - ${base}` : `Welcome - ${base}`;

} else if (
  path === '/benvenuto/login' || path === '/benvenuto/accedi' ||
  path === '/welcome/login'   || path === '/welcome/accedi'
) {
  titolo = codice === 'it' ? `Accedi - ${base}` : `Sign in - ${base}`;

} else if (
  path === '/benvenuto/registrazione' || path === '/benvenuto/registration' ||
  path === '/welcome/registrazione'   || path === '/welcome/registration'
) {
  titolo = codice === 'it' ? `Registrazione - ${base}` : `Sign up - ${base}`;

} else if (path === '/catalogo' || path === '/catalogo/' || path === '/catalog' || path === '/catalog/') {
  titolo = codice === 'it' ? `Film e Serie - ${base}` : `Movies & Series - ${base}`;

} else if (path === '/catalogo/film' || path === '/catalog/movies') {
  titolo = codice === 'it' ? `Tutti i film - ${base}` : `All Movies - ${base}`;

} else if (path === '/catalogo/serie' || path === '/catalog/series') {
  titolo = codice === 'it' ? `Tutte le serie - ${base}` : `All Series - ${base}`;

} else if (path === '/catalogo/film-serie' || path === '/catalog/movies-series') {
  titolo = codice === 'it' ? `Film e Serie - ${base}` : `Movies & Series - ${base}`;

} else if (path === '/non-trovato' || path === '/not-found') {
  titolo = codice === 'it' ? `Pagina non trovata - ${base}` : `Page Not Found - ${base}`;
}


    this.title.setTitle(titolo); // Imposto il titolo del browser con quello calcolato
  }

  /**
 * Rimuove query string e hash dall'URL, restituendo solo il path.
 *
 * @param url URL completa o parziale da normalizzare.
 * @returns Path dell'URL senza '?' e '#'.
 */
  private pulisciUrl(url: string): string {
    return (url || '').split('?')[0].split('#')[0]; // Ritorno solo il path prima di '?' e '#'
  }

    pathDaTipoCorrente(): string {
    const tipo = this.tipoContenuto.leggiTipo();
    if (tipo === 'film') return '/catalogo/film';
    if (tipo === 'serie') return '/catalogo/serie';
    return '/catalogo/film-serie';
  }
 private pulisciUrlSenzaLingua(url: string): string {
   const path = this.pulisciUrl(url);
   return path.replace(/^\/(it|en)(?=\/|$)/, '');
 }

}
