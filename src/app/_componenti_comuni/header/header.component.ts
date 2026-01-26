// Componente che gestisce l'header dell'app, mantenendo sincronizzati navigazione, autenticazione e cambio lingua, e facendo da punto di coordinamento tra UI e servizi globali.

import { Component, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter, Observable, take } from 'rxjs';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { Auth } from 'src/app/_type/auth.type';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { StatoSessioneClientService } from 'src/app/_servizi_globali/stato-sessione-client.service';
import { ErroreGlobaleService } from 'src/app/_servizi_globali/errore-globale.service';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { TipoContenuto, TipoContenutoService } from 'src/app/_catalogo/app-riga-categoria/categoria_services/tipo-contenuto.service';
import { Location } from '@angular/common';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnDestroy {
  mostraRicerca = false; // tengo traccia se sto mostrando o meno la barra/area di ricerca
  menuUtenteAperto = false; // mi segno se il menu utente è aperto
  menuCategorieAperto = false; // mi segno se il menu delle categorie è aperto
  menuTipoAperto = false; // mi segno se il menu tipo contenuto è aperto
  linguaInCambio: boolean = false; // mi segno se sto eseguendo un cambio lingua (per bloccare interazioni e mostrare spinner)

  solo_brawser_blocca = true; // capisco se è solo l'audio bloccato dall brawser e non dall'utente
  disabilitaLingua = false; // mi imposto se devo disabilitare il cambio lingua in UI

  authCorrente: Auth | null = null; // mi salvo lo stato di autenticazione reale corrente (o null se non loggato)
  authVisuale: Auth | null = null; // mi salvo lo stato di autenticazione iniziale da mostrare a schermo, lo segno null inizialmente ma poi verrà impostato con ciò che prende dal costruttore, in seguito gli osservatori lo potranno cambiare ulteriormente
  logoutInCorso = false; // mi segno se ho un logout in corso (per bloccare click e aggiornamenti)
  private shieldLogout: HTMLDivElement | null = null; // mi tengo il riferimento allo 'schermo' che blocca l’interfaccia durante il logout
  distruggi$ = new Subject<void>(); // creo un subject che uso per chiudere le subscribe con takeUntil quando il componente si distrugge

  paginaLogin = false; // mi segno se mi trovo nella pagina di login (per adattare l’header)
  headerPronto = false; // mi segno quando l’header è pronto da mostrare senza glitch dopo navigazione/reload
  cambioLinguaService: CambioLinguaService; // mi tengo il riferimento al servizio che gestisce il cambio lingua
  iconaLingua$!: Observable<string>; // mi espongo uno stream con l’icona della lingua da mostrare in modo reattivo

  private spinnerStart = 0; // mi salvo il timestamp di inizio spinner per calcolarne la durata
  private readonly MIN_SPINNER = 300; // imposto una durata minima dello spinner per evitare flicker
  tipoSelezionato: 'film_serie' | 'film' | 'serie' = 'film_serie';
  constructor(
    private api: ApiService,
    private authService: Authservice,
    private router: Router,
    cambioLinguaService: CambioLinguaService,
    private translate: TranslateService,
    private http: HttpClient,
    private location: Location,
    private tipoContenuto: TipoContenutoService,
    private statoSessione: StatoSessioneClientService,
    private erroreGlobale: ErroreGlobaleService
  ) {
    this.tipoSelezionato = this.tipoContenuto.leggiTipo();
    this.cambioLinguaService = cambioLinguaService; // mi salvo il servizio di cambio lingua nella proprietà del componente
    this.iconaLingua$ = this.cambioLinguaService.iconaLingua$; // mi aggancio all'evento dell'icona della lingua per mostrarla in modo reattivo

    this.paginaLogin = this.router.url.startsWith('/benvenuto/login'); // capisco subito se mi trovo nella pagina di login leggendo l'url attuale

    this.router.events // ascolto gli eventi del router per aggiornare lo stato quando cambio pagina
      .pipe(
        // compongo la catena di operatori per filtrare e chiudere correttamente le sottoscrizioni
        takeUntil(this.distruggi$), // mi assicuro di interrompere l'ascolto quando il componente viene distrutto
        filter((ev): ev is NavigationEnd => ev instanceof NavigationEnd) // considero solo gli eventi di fine navigazione
      )
      .subscribe((ev: NavigationEnd) => {
        // reagisco a ogni navigazione completata
        const url = ev.urlAfterRedirects || ev.url; // prendo l'url definitivo dopo eventuali reindirizzamenti
        this.paginaLogin = url.startsWith('/benvenuto/login'); // aggiorno il flag per sapere se sono nella pagina di login
        this.headerPronto = true; // segno che l'header può essere mostrato senza 'flash' dopo un reload
      });

    this.authCorrente = this.authService.leggiObsAuth().value; // leggo lo stato di autenticazione corrente al momento della costruzione
    this.authVisuale = this.authCorrente; // inizializzo lo stato  dell'utente copiando le informazioni trovate
    this.authService // mi preparo ad ascoltare i cambiamenti di autenticazione nel tempo
      .leggiObsAuth() // prendo l'observable che emette lo stato di autenticazione
      .pipe(takeUntil(this.distruggi$)) // mi assicuro di chiudere la sottoscrizione alla distruzione del componente
      .subscribe((auth: Auth) => {
        // aggiorno i miei campi ogni volta che cambia l'autenticazione
        this.authCorrente = auth; // salvo sempre lo stato reale corrente
        if (!this.logoutInCorso) {
          // evito di cambiare lo stato visivo mentre sto eseguendo il logout
          this.authVisuale = auth; // aggiorno lo stato mostrato a video solo se non sono in logout
        }
      });

    this.cambioLinguaService.cambioLinguaAvviato$ // ascolto l'evento che mi dice quando parte un cambio lingua
      .pipe(takeUntil(this.distruggi$)) // mi assicuro di interrompere l'ascolto quando il componente viene distrutto
      .subscribe(() => {
        // quando parte il cambio lingua aggiorno lo stato dello spinner
        this.spinnerStart = performance.now(); // salvo l'istante di inizio per garantire una durata minima dello spinner
        this.linguaInCambio = true; // attivo lo stato di cambio lingua per bloccare interazioni e mostrare lo spinner
      });

    this.cambioLinguaService.cambioLinguaApplicata$ // ascolto l'evento che mi dice quando il cambio lingua è stato applicato davvero
      .pipe(takeUntil(this.distruggi$)) // mi assicuro di interrompere l'ascolto quando il componente viene distrutto
      .subscribe(() => {
        // quando è tutto applicato preparo lo spegnimento dello spinner
        const elapsed = performance.now() - this.spinnerStart; // calcolo quanto tempo è già passato dall'avvio dello spinner
        const restante = Math.max(this.MIN_SPINNER - elapsed, 0); // calcolo quanto manca per rispettare la durata minima

        setTimeout(() => {
          // rimando lo spegnimento dello spinner del tempo necessario
          this.linguaInCambio = false; // disattivo lo stato di cambio lingua e tolgo lo spinner
        }, restante); // uso il tempo restante per evitare uno spegnimento troppo rapido
      });
  }
  /**
   * Metodo eseguito alla distruzione del componente.
   *
   * Logica applicata:
   * - rimuove eventuali elementi di blocco dell'interfaccia
   * - chiude tutte le sottoscrizioni attive tramite takeUntil
   * - libera risorse e stream osservabili
   *
   * @returns void
   */
  ngOnDestroy(): void {
    try {
      this.shieldLogout?.remove();
    } catch {} // provo a rimuovere lo schermo di blocco del logout e ignoro eventuali errori
    this.distruggi$.next(); // notifico a tutte le pipe takeUntil che devono chiudersi
    this.distruggi$.complete(); // completo il subject per chiudere definitivamente lo stream
  }

  /**
   * Gestisce il clic su una categoria del menu.
   *
   * Chiude il menu categorie e blocca l'azione se è in corso un logout.
   *
   * @returns void
   */
  onClickCategoria(): void {
    // gestisco il clic su una categoria del menu
    if (this.logoutInCorso) return; // se sto facendo logout, evito qualsiasi azione
    this.menuCategorieAperto = false; // chiudo il menu categorie dopo il clic
  }

  /**
   * Gestisce il clic che sblocca temporaneamente un blocco imposto dal browser.
   *
   * @returns void
   */
  clickSbloccoProvvisorio(): void {
    if (this.logoutInCorso) return; // se sto facendo logout, evito qualsiasi azione
    this.solo_brawser_blocca = false; // disattivo il blocco provvisorio sul browser
  }

  /**
   * Gestisce il comando di scollegamento dell'utente.
   *
   * Avvia il blocco dell'interfaccia, esegue il logout lato server
   * e completa il logout lato client indipendentemente dall'esito.
   *
   * @returns void
   */
  onClickScollegati(): void {
    // gestisco il clic sul comando di scollegamento
    this.avviaFreezeLogout(); // avvio il blocco dell'interfaccia per evitare interazioni durante il logout
    this.logoutInCorso = true; // segno che il logout è in corso
    this.api
      .logout() // chiamo il logout lato server tramite il servizio API
      .subscribe({
        // gestisco sia successo che errore nello stesso modo
        next: () => this.eseguiLogoutLocale(), // quando va bene, completo il logout lato client
        error: () => this.eseguiLogoutLocale(), // anche se fallisce, completo comunque il logout lato client
      });
  }

  /**
   * Attiva un blocco totale dell'interfaccia durante il logout.
   *
   * Impedisce interazioni multiple e crea uno schermo trasparente
   * che intercetta tutti i click fino al completamento del logout.
   *
   * @returns void
   */
  private avviaFreezeLogout(): void {
    if (this.logoutInCorso) return; // se ho già iniziato il logout, evito di ripetere la procedura

    this.logoutInCorso = true; // segno che il logout è iniziato per bloccare le altre azioni

    this.menuUtenteAperto = true; // tengo aperto il menu utente per non far 'sparire' il contesto del clic
    this.mostraRicerca = false; // chiudo la ricerca per ridurre elementi interattivi durante il logout
    this.menuCategorieAperto = false; // chiudo il menu categorie per evitare interazioni

    const shield = document.createElement('div'); // creo un elemento che copre tutta la pagina per intercettare i click e provo tramite js a darli lo stile che mi serve per l'occasione
    shield.id = 'logout_shield'; // assegno un id per riconoscerlo e poterlo rimuovere
    shield.style.position = 'fixed'; // lo fisso alla finestra così resta sopra tutto anche con scroll
    shield.style.top = '0';
    shield.style.left = '0';
    shield.style.width = '100vw'; // gli do la larghezza dell'intera finestra
    shield.style.height = '100vh'; // gli do l'altezza dell'intera finestra
    shield.style.zIndex = '9999'; // lo porto sopra a quasi tutti gli elementi dell'interfaccia
    shield.style.background = 'transparent';
    shield.style.pointerEvents = 'all';
    shield.style.cursor = 'progress';
    document.body.appendChild(shield); // aggiungo lo schermo di blocco al body
    this.shieldLogout = shield; // mi salvo il riferimento per poterlo rimuovere più tardi
  }

  /**
   * Completa il logout lato client e prepara il ricaricamento controllato della pagina.
   *
   * Logica applicata:
   * - reset dello stato di errore globale
   * - svuotamento dello stato di autenticazione
   * - impostazione del flag di ricaricamento per evitare loop
   * - reload dopo un breve delay
   *
   * @returns void
   */
  eseguiLogoutLocale(): void {
    this.erroreGlobale.resettaErroreFatale(); // pulisco eventuali toast e pagine bloccanti

    this.authService.logout(false); // dico che la sessione non è verificata cosi da rimostrare il loader

    if (!this.statoSessione.staRicaricando) { // controllo se non sto già ricaricando per evitare loop
      this.statoSessione.staRicaricando = true; // segno che sto per ricaricare così blocco richiami successivi

      setTimeout(() => { // rimando il reload per dare tempo alle operazioni di chiusura di completarsi
        console.log('Ricaricando la pagina dopo il logout'); // scrivo in console che sto per ricaricare dopo il logout
        window.location.reload(); // ricarico la pagina per ripartire pulito
      }, 1000); // lascio un margine di tempo per completare le operazioni in corso
    }
  }

  /**
   * Gestisce il comando di cambio lingua dall'header.
   *
   * Blocca l'azione se:
   * - è in corso un logout
   * - il cambio lingua è disabilitato
   * - un altro cambio lingua è già in corso
   *
   * La logica completa è demandata al servizio dedicato.
   *
   * @returns void
   */
  cambiaLingua(): void {
    // gestisco il comando di cambio lingua dall'header
    if (this.logoutInCorso) return; // se sto facendo logout, blocco il cambio lingua
    if (this.disabilitaLingua || this.linguaInCambio) {
      // se la lingua è disabilitata o sto già cambiando, non faccio nulla
      return; // esco senza avviare un nuovo cambio lingua
    }

    this.cambioLinguaService.cambiaLingua(); // avvio il cambio lingua demandando la gestione completa al servizio
  }

    get isIt(): boolean {
    return this.cambioLinguaService.leggiCodiceLingua() === 'it';
  }


  get etichettaTipoSelezionato(): string {
    return this.etichettaTipo(this.tipoSelezionato);
  }

  get opzioniTipoNonSelezionate(): Array<'film_serie' | 'film' | 'serie'> {
    const tutte: Array<'film_serie' | 'film' | 'serie'> = ['film_serie', 'film', 'serie'];
    return tutte.filter(x => x !== this.tipoSelezionato);
  }

  etichettaTipo(val: 'film_serie' | 'film' | 'serie'): string {
    const it = this.isIt;
    if (val === 'film') return it ? 'Solo film' : 'Only Movies';
    if (val === 'serie') return it ? 'Solo serie' : 'Only Series';
    return it ? 'Film e serie' : 'Movies and series';
  }

  onSelezionaTipo(val: TipoContenuto): void {
    if (this.logoutInCorso) return;
    this.tipoSelezionato = val;
    this.menuTipoAperto = false;
    this.tipoContenuto.impostaTipo(val);
    this.location.go(this.pathCatalogoDaTipo(val));
  }


  pathCatalogoDaTipo(val: TipoContenuto): string {
    if (val === 'film') return '/catalogo/film';
    if (val === 'serie') return '/catalogo/serie';
    return '/catalogo/film-serie';
  }
}
