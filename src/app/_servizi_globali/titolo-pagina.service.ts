// Servizio che decide il titolo del browser in base alla pagina corrente, alla lingua attiva e al tipo contenuto selezionato.

import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CambioLinguaService } from './cambio-lingua.service';
import { TipoContenutoService } from 'src/app/_catalogo/riga-categoria/categoria_services/tipo-contenuto.service';

@Injectable({ providedIn: 'root' })
export class TitoloPaginaService {
  constructor(
    private title: Title,
    private router: Router,
    private tipoContenuto: TipoContenutoService,
    private cambioLinguaService: CambioLinguaService
  ) {}

  /**
   * Avvia la logica di aggiornamento del titolo ascoltando rotta, lingua e tipo contenuto.
   *
   * @returns void
   */
  avvia(): void {
    this.aggiornaTitolo(this.pathInizialePerTitolo()); // imposto subito il titolo iniziale corretto

    this.router.events // mi metto in ascolto degli eventi del router
      .pipe(filter((ev) => ev instanceof NavigationEnd)) // tengo solo gli eventi di fine navigazione
      .subscribe((ev: any) => { // reagisco a ogni navigazione completata
        const url = // ricavo l'URL finale disponibile dall'evento
          ev && ev.urlAfterRedirects // controllo se esiste l'URL dopo eventuali redirect
            ? ev.urlAfterRedirects // uso l'URL finale dopo i redirect
            : ev && ev.url // altrimenti controllo se esiste almeno l'URL base
            ? ev.url // uso l'URL base dell'evento
            : ''; // in fallback uso stringa vuota
        this.aggiornaTitolo(url); // aggiorno il titolo in base all'URL appena navigato

        const path = this.pulisciUrlSenzaLingua(url); // pulisco l'URL e rimuovo il prefisso lingua
        if (path === '/catalogo' || path === '/catalogo/' || path.startsWith('/catalogo/') || // controllo se mi trovo nell'area catalogo italiana
            path === '/catalog'  || path === '/catalog/'  || path.startsWith('/catalog/')) { // controllo se mi trovo nell'area catalogo inglese
          this.aggiornaTitolo(this.pathDaTipoCorrente()); // riallineo sempre il titolo al tipo contenuto corrente
        }
      });

    this.cambioLinguaService.cambioLinguaApplicata$.subscribe(() => { // reagisco quando il cambio lingua e' stato applicato
      const path = this.pulisciUrlSenzaLingua(this.router.url || ''); // ricavo il path corrente senza prefisso lingua
      if (path === '/non-trovato' || path === '/not-found') { // controllo se mi trovo nella pagina not found
        this.aggiornaTitolo(this.router.url || ''); // aggiorno il titolo usando l'URL reale corrente
        return; // esco subito dopo aver aggiornato il titolo
      }
      if (path === '/catalogo' || path === '/catalogo/' || path.startsWith('/catalogo/') || // controllo se mi trovo nell'area catalogo italiana
          path === '/catalog'  || path === '/catalog/'  || path.startsWith('/catalog/')) { // controllo se mi trovo nell'area catalogo inglese
        this.aggiornaTitolo(this.pathDaTipoCorrente()); // aggiorno il titolo usando il tipo contenuto attuale
        return; // esco subito dopo aver aggiornato il titolo
      }
      this.aggiornaTitolo(this.router.url || ''); // aggiorno normalmente il titolo per tutte le altre pagine
    });

    this.tipoContenuto.tipoSelezionato$.subscribe((tipo) => { // reagisco quando cambia il tipo contenuto selezionato
      const base = this.pulisciUrlSenzaLingua(this.router.url || ''); // ricavo il path corrente senza lingua
      if (!base.startsWith('/catalogo') && !base.startsWith('/catalog')) return; // aggiorno il titolo solo se mi trovo nel catalogo
      const fintoPath = // costruisco un path coerente con il tipo corrente
        tipo === 'film' ? '/catalogo/film' // uso il path film se il tipo e' film
        : tipo === 'serie' ? '/catalogo/serie' // uso il path serie se il tipo e' serie
        : '/catalogo/film-serie'; // altrimenti uso il path film-serie
      this.aggiornaTitolo(fintoPath); // aggiorno il titolo usando il path simulato coerente con il tipo
    });
  }

  /**
   * Calcola il path iniziale da usare per impostare il titolo corretto all'avvio.
   *
   * @returns string
   */
  pathInizialePerTitolo(): string {
    const path = this.pulisciUrlSenzaLingua(this.router.url || ''); // ricavo il path iniziale senza prefisso lingua
    const eCatalogoNudo = // controllo se mi trovo nel catalogo senza sotto-sezione specifica
      path === '/catalogo' || path === '/catalogo/' || // verifico il catalogo italiano base
      path === '/catalog'  || path === '/catalog/'; // verifico il catalogo inglese base
    if (!eCatalogoNudo) return this.router.url || ''; // se non sono nel catalogo nudo uso direttamente l'URL reale

    const tipo = this.tipoContenuto.leggiTipo(); // leggo il tipo contenuto attualmente selezionato
    const base = path.startsWith('/catalog') ? '/catalog' : '/catalogo'; // scelgo la base coerente con la lingua/path corrente
    if (tipo === 'film') return base + (base === '/catalog' ? '/movies' : '/film'); // ritorno il path film coerente con la lingua
    if (tipo === 'serie') return base + (base === '/catalog' ? '/series' : '/serie'); // ritorno il path serie coerente con la lingua
    return base + (base === '/catalog' ? '/movies-series' : '/film-serie'); // ritorno il path misto coerente con la lingua
  }

  /**
   * Imposta manualmente il titolo di una scheda contenuto aggiungendo il nome del sito.
   *
   * @param titolo Titolo specifico della scheda.
   * @returns void
   */
  impostaTitoloScheda(titolo: string): void {
    const base = 'ScienceCode X'; // definisco il nome base del sito
    if (titolo) { // controllo che il titolo ricevuto non sia vuoto
      this.title.setTitle(`${titolo} - ${base}`); // imposto il titolo finale della scheda nel browser
    }
  }

  /**
   * Calcola e imposta il titolo del browser in base alla rotta e alla lingua corrente.
   *
   * @param url URL o path da cui ricavare la rotta corrente.
   * @returns void
   */
  private aggiornaTitolo(url: string): void {
    const codice = this.cambioLinguaService.leggiCodiceLingua(); // leggo il codice lingua corrente
    const path = this.pulisciUrlSenzaLingua(url); // pulisco l'URL da query, hash e prefisso lingua

    const base = 'ScienceCode X'; // definisco il nome base del sito da mantenere nel titolo
    let titolo = base; // imposto un titolo di default

    if ( // controllo se mi trovo nella pagina benvenuto
      path === '/benvenuto' || path === '/benvenuto/' || // verifico i path italiani della welcome
      path === '/welcome'   || path === '/welcome/' // verifico i path inglesi della welcome
    ) {
      titolo = codice === 'it' ? `Benvenuto - ${base}` : `Welcome - ${base}`; // imposto il titolo localizzato della welcome

    } else if ( // controllo se mi trovo nella pagina login
      path === '/benvenuto/login' || path === '/benvenuto/accedi' || // verifico i path login italiani
      path === '/welcome/login'   || path === '/welcome/accedi' // verifico i path login inglesi o misti
    ) {
      titolo = codice === 'it' ? `Accedi - ${base}` : `Sign in - ${base}`; // imposto il titolo localizzato della login

    } else if ( // controllo se mi trovo nella pagina registrazione
      path === '/benvenuto/registrazione' || path === '/benvenuto/registration' || // verifico i path registrazione italiani o misti
      path === '/welcome/registrazione'   || path === '/welcome/registration' // verifico i path registrazione inglesi o misti
    ) {
      titolo = codice === 'it' ? `Registrazione - ${base}` : `Sign up - ${base}`; // imposto il titolo localizzato della registrazione

    } else if (path === '/catalogo' || path === '/catalogo/' || path === '/catalog' || path === '/catalog/') { // controllo se mi trovo nel catalogo generale
      titolo = codice === 'it' ? `Film e Serie - ${base}` : `Movies & Series - ${base}`; // imposto il titolo localizzato del catalogo generale

    } else if (path === '/catalogo/film' || path === '/catalog/movies') { // controllo se mi trovo nella sezione film
      titolo = codice === 'it' ? `Tutti i film - ${base}` : `All Movies - ${base}`; // imposto il titolo localizzato dei film

    } else if (path === '/catalogo/serie' || path === '/catalog/series') { // controllo se mi trovo nella sezione serie
      titolo = codice === 'it' ? `Tutte le serie - ${base}` : `All Series - ${base}`; // imposto il titolo localizzato delle serie

    } else if (path === '/catalogo/film-serie' || path === '/catalog/movies-series') { // controllo se mi trovo nella sezione film e serie
      titolo = codice === 'it' ? `Film e Serie - ${base}` : `Movies & Series - ${base}`; // imposto il titolo localizzato della sezione mista

    } else if (path === '/non-trovato' || path === '/not-found') {
      titolo = codice === 'it' ? `Pagina non trovata - ${base}` : `Page Not Found - ${base}`;

    } else if (path === '/piano' || path === '/plan') {
      titolo = codice === 'it' ? `Il tuo piano - ${base}` : `Your plan - ${base}`;
    }

    this.title.setTitle(titolo); // imposto il titolo del browser con quello calcolato
  }

  /**
   * Rimuove query string e hash dall'URL restituendo solo il path.
   *
   * @param url URL completa o parziale da normalizzare.
   * @returns string
   */
  private pulisciUrl(url: string): string {
    return (url || '').split('?')[0].split('#')[0]; // ritorno solo il path prima di query string e hash
  }

  /**
   * Costruisce un path coerente con il tipo contenuto attualmente selezionato.
   *
   * @returns string
   */
  pathDaTipoCorrente(): string {
    const tipo = this.tipoContenuto.leggiTipo(); // leggo il tipo contenuto attualmente selezionato
    if (tipo === 'film') return '/catalogo/film'; // ritorno il path film se il tipo e' film
    if (tipo === 'serie') return '/catalogo/serie'; // ritorno il path serie se il tipo e' serie
    return '/catalogo/film-serie'; // ritorno il path misto per tutti gli altri casi
  }

  /**
   * Rimuove dall'URL il prefisso lingua mantenendo solo il path applicativo.
   *
   * @param url URL completa o parziale da normalizzare.
   * @returns string
   */
  private pulisciUrlSenzaLingua(url: string): string {
    const path = this.pulisciUrl(url); // ricavo prima il path pulito da query e hash
    return path.replace(/^\/(it|en)(?=\/|$)/, ''); // rimuovo l'eventuale prefisso lingua iniziale
  }
}
