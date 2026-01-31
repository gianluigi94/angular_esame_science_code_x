// servizio dove decido il title da inserire in base alla pagina in cui si trova l'utente
import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CambioLinguaService } from './cambio-lingua.service';
import { TipoContenutoService } from 'src/app/_catalogo/app-riga-categoria/categoria_services/tipo-contenuto.service';

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
    const path = this.pulisciUrl(url);
    if (path === '/catalogo' || path === '/catalogo/' || path.startsWith('/catalogo/')) {
      this.aggiornaTitolo(this.pathDaTipoCorrente());
    }
     });

    this.cambioLinguaService.cambioLinguaApplicata$.subscribe(() => {
  const path = this.pulisciUrl(this.router.url || '');
  if (path === '/catalogo' || path === '/catalogo/' || path.startsWith('/catalogo/')) {
    this.aggiornaTitolo(this.pathDaTipoCorrente());
    return;
  }
  this.aggiornaTitolo(this.router.url || '');
 });


   this.tipoContenuto.tipoSelezionato$.subscribe((tipo) => {
    // aggiorno il titolo solo se sono nel catalogo (altrimenti rischi titoli "sbagliati" in altre pagine)
    const base = this.pulisciUrl(this.router.url || '');
    if (!base.startsWith('/catalogo')) return;
     const fintoPath =
       tipo === 'film' ? '/catalogo/film'
       : tipo === 'serie' ? '/catalogo/serie'
       : '/catalogo/film-serie';
     this.aggiornaTitolo(fintoPath);
   });
 }

 pathInizialePerTitolo(): string {
   const path = this.pulisciUrl(this.router.url || '');
   const eCatalogoNudo = path === '/catalogo' || path === '/catalogo/';
   if (!eCatalogoNudo) return this.router.url || '';

   const tipo = this.tipoContenuto.leggiTipo();
   if (tipo === 'film') return '/catalogo/film';
   if (tipo === 'serie') return '/catalogo/serie';
   return '/catalogo/film-serie';
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
    const path = this.pulisciUrl(url); // Pulisco l'URL da query e hash

    const base = 'ScienceCode X'; // Definisco il nome base del sito da mettere sempre nel titolo
    let titolo = base; // Imposto un titolo di default

    if (path === '/benvenuto' || path === '/benvenuto/') {
      // Controllo se sono nella pagina benvenuto
      titolo = codice === 'it' ? `Benvenuto - ${base}` : `Welcome - ${base}`;
        } else if (path === '/benvenuto/login' || path === '/benvenuto/accedi') {
      titolo = codice === 'it' ? `Accedi - ${base}` : `Sign in - ${base}`;
     } else if (path === '/catalogo' || path === '/catalogo/') {
      titolo = codice === 'it' ? `Film e Serie - ${base}` : `Movies & Series - ${base}`;
    } else if (path === '/catalogo/film') {
      titolo = codice === 'it' ? `Tutti i film - ${base}` : `All Movies - ${base}`;
    } else if (path === '/catalogo/serie') {
      titolo = codice === 'it' ? `Tutte le serie - ${base}` : `All Series - ${base}`;
    } else if (path === '/catalogo/film-serie') {
      titolo = codice === 'it' ? `Film e Serie - ${base}` : `Movies & Series - ${base}`;
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

}
