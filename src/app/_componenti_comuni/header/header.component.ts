// Componente che gestisce l'header dell'app, mantenendo sincronizzati navigazione, autenticazione e cambio lingua, e facendo da punto di coordinamento tra UI e servizi globali.

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter, Observable, take, forkJoin } from 'rxjs';
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
import { ScorrimentoCatalogoService } from 'src/app/_catalogo/app-riga-categoria/categoria_services/scorrimento-catalogo.service';
import { AudioGlobaleService } from 'src/app/_servizi_globali/audio-globale.service';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  mostraRicerca = false; // tengo traccia se sto mostrando o meno la barra/area di ricerca
  menuUtenteAperto = false; // mi segno se il menu utente è aperto
  menuCategorieAperto = false; // mi segno se il menu delle categorie è aperto
  menuTipoAperto = false; // mi segno se il menu tipo contenuto è aperto
  linguaInCambio: boolean = false; // mi segno se sto eseguendo un cambio lingua (per bloccare interazioni e mostrare spinner)

  solo_brawser_blocca = false; // capisco se è solo l'audio bloccato dall brawser e non dall'utente
  disabilitaLingua = false; // mi imposto se devo disabilitare il cambio lingua in UI

  spinnerScroll$!: Observable<boolean>;
  vociCategorieMenu: Array<{ idCategoria: string; codice: string; label: string }> = [];
  caricamentoCategorieMenu = false;

  authCorrente: Auth | null = null; // mi salvo lo stato di autenticazione reale corrente (o null se non loggato)
  authVisuale: Auth | null = null; // mi salvo lo stato di autenticazione iniziale da mostrare a schermo, lo segno null inizialmente ma poi verrà impostato con ciò che prende dal costruttore, in seguito gli osservatori lo potranno cambiare ulteriormente
  logoutInCorso = false; // mi segno se ho un logout in corso (per bloccare click e aggiornamenti)
  private shieldLogout: HTMLDivElement | null = null; // mi tengo il riferimento allo 'schermo' che blocca l’interfaccia durante il logout
  distruggi$ = new Subject<void>(); // creo un subject che uso per chiudere le subscribe con takeUntil quando il componente si distrugge

  paginaLogin = false; // mi segno se mi trovo nella pagina di login (per adattare l'header)
  headerPronto = false; // mi segno quando l'header è pronto da mostrare senza glitch dopo navigazione/reload
  cambioLinguaService: CambioLinguaService; // mi tengo il riferimento al servizio che gestisce il cambio lingua
  iconaLingua$!: Observable<string>; // mi espongo uno stream con l'icona della lingua da mostrare in modo reattivo

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
    private erroreGlobale: ErroreGlobaleService,
    public scorrimentoCatalogo: ScorrimentoCatalogoService,
    private audioGlobaleService: AudioGlobaleService
  ) {
    this.tipoSelezionato = this.tipoContenuto.leggiTipo();
    this.cambioLinguaService = cambioLinguaService; // mi salvo il servizio di cambio lingua nella proprieta' del componente
    this.iconaLingua$ = this.cambioLinguaService.iconaLingua$; // mi aggancio all'evento dell'icona della lingua per mostrarla in modo reattivo
    this.spinnerScroll$ = this.scorrimentoCatalogo.spinnerScroll$;


     this.paginaLogin =
       this.router.url.startsWith('/benvenuto/login') ||
       this.router.url.startsWith('/benvenuto/accedi') ||
       this.router.url.startsWith('/welcome/login') ||
       this.router.url.startsWith('/welcome/accedi');

    this.router.events // ascolto gli eventi del router per aggiornare lo stato quando cambio pagina
      .pipe(
        takeUntil(this.distruggi$), // mi assicuro di interrompere l'ascolto quando il componente viene distrutto
        filter((ev): ev is NavigationEnd => ev instanceof NavigationEnd) // considero solo gli eventi di fine navigazione
      )
      .subscribe((ev: NavigationEnd) => {
        const url = ev.urlAfterRedirects || ev.url; // prendo l'url definitivo dopo eventuali reindirizzamenti
                         this.paginaLogin =
           url.startsWith('/benvenuto/login') ||
           url.startsWith('/benvenuto/accedi') ||
           url.startsWith('/welcome/login') ||
           url.startsWith('/welcome/accedi');
        this.headerPronto = true; // segno che l'header puo' essere mostrato senza 'flash' dopo un reload
      });

    this.authCorrente = this.authService.leggiObsAuth().value; // leggo lo stato di autenticazione corrente al momento della costruzione
    this.authVisuale = this.authCorrente; // inizializzo lo stato dell'utente copiando le informazioni trovate
    this.authService // mi preparo ad ascoltare i cambiamenti di autenticazione nel tempo
      .leggiObsAuth() // prendo l'observable che emette lo stato di autenticazione
      .pipe(takeUntil(this.distruggi$)) // mi assicuro di chiudere la sottoscrizione alla distruzione del componente
      .subscribe((auth: Auth) => {
        this.authCorrente = auth; // salvo sempre lo stato reale corrente
        if (!this.logoutInCorso) {
          this.authVisuale = auth; // aggiorno lo stato mostrato a video solo se non sono in logout
        }
        if (auth?.tk) this.caricaCategorieMenu();
      });

    this.cambioLinguaService.cambioLinguaAvviato$ // ascolto l'evento che mi dice quando parte un cambio lingua
      .pipe(takeUntil(this.distruggi$)) // mi assicuro di interrompere l'ascolto quando il componente viene distrutto
      .subscribe(() => {
        this.spinnerStart = performance.now(); // salvo l'istante di inizio per garantire una durata minima dello spinner
        this.linguaInCambio = true; // attivo lo stato di cambio lingua per bloccare interazioni e mostrare lo spinner
      });

    this.cambioLinguaService.cambioLinguaApplicata$ // ascolto l'evento che mi dice quando il cambio lingua e' stato applicato davvero
      .pipe(takeUntil(this.distruggi$)) // mi assicuro di interrompere l'ascolto quando il componente viene distrutto
      .subscribe(() => {
        const elapsed = performance.now() - this.spinnerStart; // calcolo quanto tempo e' gia' passato dall'avvio dello spinner
        const restante = Math.max(this.MIN_SPINNER - elapsed, 0); // calcolo quanto manca per rispettare la durata minima

        setTimeout(() => {
          this.linguaInCambio = false; // disattivo lo stato di cambio lingua e tolgo lo spinner
        }, restante); // uso il tempo restante per evitare uno spegnimento troppo rapido

        if (this.authVisuale?.tk) this.caricaCategorieMenu();
      });

  }

  ngOnInit(): void {
    if (this.authVisuale?.tk) this.caricaCategorieMenu();
        this.audioGlobaleService.soloBlocca$
      .pipe(takeUntil(this.distruggi$))
      .subscribe((v) => {
        this.solo_brawser_blocca = !!v;
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
    } catch {}
    this.distruggi$.next();
    this.distruggi$.complete();
  }

  /**
   * Gestisce il clic su una categoria del menu.
   *
   * Chiude il menu categorie e blocca l'azione se e' in corso un logout.
   *
   * @returns void
   */
  onClickCategoria(): void {
    if (this.logoutInCorso) return;
    this.menuCategorieAperto = false;
  }

  onSelezionaCategoria(voce: { idCategoria: string; codice: string; label: string }): void {
    if (this.logoutInCorso) return;
    this.menuCategorieAperto = false;
    this.scorrimentoCatalogo.richiediScroll(voce.idCategoria);
  }

  caricaCategorieMenu(): void {
    if (this.caricamentoCategorieMenu) return;
    this.caricamentoCategorieMenu = true;

    const richiestaCategorie$ = this.api.getCategorieCatalogo().pipe(take(1));
    const richiestaTraduzioni$ = this.api.getCategorieTraduzioni().pipe(take(1));

    forkJoin([richiestaCategorie$, richiestaTraduzioni$]).subscribe({
      next: ([categorie, traduzioni]) => {
        const listaCategorie = Array.isArray((categorie as any)?.data?.items)
          ? (categorie as any).data.items
          : Array.isArray((categorie as any)?.data)
            ? (categorie as any).data
            : [];

        const listaTraduzioni = Array.isArray((traduzioni as any)?.data?.items)
          ? (traduzioni as any).data.items
          : Array.isArray((traduzioni as any)?.data)
            ? (traduzioni as any).data
            : [];

        const idLingua = this.isIt ? 1 : 2;
        const mappaNome: Record<string, string> = {};
        for (const tr of listaTraduzioni || []) {
          if (String(tr?.id_lingua) !== String(idLingua)) continue;
          const idCategoria = String(tr?.id_categoria || '');
          const nome = String(tr?.nome || '');
          if (idCategoria && nome) mappaNome[idCategoria] = nome;
        }

        const voci: Array<{ idCategoria: string; codice: string; label: string }> = [];
        for (const c of listaCategorie || []) {
          const idCategoria = String(c?.id_categoria || c?.idCategoria || '');
          const codice = String(c?.codice || c?.code || '');
          if (!idCategoria) continue;
          const label = mappaNome[idCategoria] || codice || idCategoria;
          voci.push({ idCategoria, codice, label });
        }

        this.vociCategorieMenu = voci;
        this.caricamentoCategorieMenu = false;
      },
      error: () => {
        this.vociCategorieMenu = [];
        this.caricamentoCategorieMenu = false;
      },
    });
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
    this.avviaFreezeLogout();
    this.logoutInCorso = true;
    this.api
      .logout()
      .subscribe({
        next: () => this.eseguiLogoutLocale(),
        error: () => this.eseguiLogoutLocale(),
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
    if (this.logoutInCorso) return;

    this.logoutInCorso = true;

    this.menuUtenteAperto = true;
    this.mostraRicerca = false;
    this.menuCategorieAperto = false;

    const shield = document.createElement('div');
    shield.id = 'logout_shield';
    shield.style.position = 'fixed';
    shield.style.top = '0';
    shield.style.left = '0';
    shield.style.width = '100vw';
    shield.style.height = '100vh';
    shield.style.zIndex = '9999';
    shield.style.background = 'transparent';
    shield.style.pointerEvents = 'all';
    shield.style.cursor = 'progress';
    document.body.appendChild(shield);
    this.shieldLogout = shield;
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
    this.erroreGlobale.resettaErroreFatale();

    this.authService.logout(false);

    if (!this.statoSessione.staRicaricando) {
      this.statoSessione.staRicaricando = true;

      setTimeout(() => {
        console.log('Ricaricando la pagina dopo il logout');
        window.location.reload();
      }, 1000);
    }
  }

  /**
   * Gestisce il comando di cambio lingua dall'header.
   *
   * Blocca l'azione se:
   * - e' in corso un logout
   * - il cambio lingua e' disabilitato
   * - un altro cambio lingua e' gia' in corso
   *
   * La logica completa e' demandata al servizio dedicato.
   *
   * @returns void
   */
  cambiaLingua(): void {
    if (this.logoutInCorso) return;
    if (this.disabilitaLingua || this.linguaInCambio) {
      return;
    }

    this.cambioLinguaService.cambiaLingua();
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
 baseCatalogoDaUrl(): string {
   const full = this.location.path(true) || '';
   const soloPath = full.split('?')[0].split('#')[0];
   const matchBase = soloPath.match(/^\/(catalogo|catalog)(\/|$)/);
   if (matchBase?.[1] === 'catalog') return '/catalog';
   if (matchBase?.[1] === 'catalogo') return '/catalogo';
   // fallback (se per qualche motivo non sono nel catalogo)
   return this.cambioLinguaService.leggiCodiceLingua() === 'it' ? '/catalogo' : '/catalog';
 }
  pathCatalogoDaTipo(val: TipoContenuto): string {
      const base = this.baseCatalogoDaUrl(); // preserva catalog vs catalogo dall'URL corrente
    const en = base === '/catalog';
  if (val === 'film') return base + (en ? '/movies' : '/film');
  if (val === 'serie') return base + (en ? '/series' : '/serie');
  return base + (en ? '/movies-series' : '/film-serie');
  }
}
