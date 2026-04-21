// Componente header che gestisce stato UI, navigazione e coordinamento tra servizi e helper.
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter, Observable } from 'rxjs';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { Auth } from 'src/app/_type/auth.type';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { StatoSessioneClientService } from 'src/app/_servizi_globali/stato-sessione-client.service';
import { ErroreGlobaleService } from 'src/app/_servizi_globali/errore-globale.service';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import {
  TipoContenuto,
  TipoContenutoService,
} from 'src/app/_catalogo/riga-categoria/categoria_services/tipo-contenuto.service';
import { SchedaPlayerTransizioneTitoloService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/scheda-player-transizione-titolo.service';
import { ScorrimentoCatalogoService } from 'src/app/_catalogo/riga-categoria/categoria_services/scorrimento-catalogo.service';
import { AudioGlobaleService } from 'src/app/_servizi_globali/audio-globale.service';
import { ContattiNavigazioneService } from 'src/app/_servizi_globali/contatti-navigazione.service';
import { StopVideoGlobaleService } from 'src/app/_catalogo/riga-categoria/categoria_services/stop-video-globale.service';
import { SchedaProntaService } from 'src/app/_catalogo/scheda/scheda_service/scheda-pronta.service';
import { CambioPianoAnimazioneService } from 'src/app/_servizi_globali/cambio-piano-animazione.service';
import { CambioRicevuteAnimazioneService } from 'src/app/_servizi_globali/cambio-ricevute-animazione.service';
import { prefissoLinguaDaUrl, baseCatalogoDaUrl, pathCatalogoDaTipo, pathLoginDaLingua, isPaginaScheda} from './header_utility/header-url.utils';
import { HeaderAuthHelper } from './header_helpers/header-auth.helper';
import { HeaderCategorieHelper } from './header_helpers/header-categorie.helper';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
   // Stato UI del componente.
  mostraRicerca = false; // gestisco la visibilita' della ricerca
  menuUtenteAperto = false; // gestisco l'apertura del menu utente
  menuCategorieAperto = false; // gestisco l'apertura del menu categorie
  menuTipoAperto = false; // gestisco l'apertura del menu tipo
  linguaInCambio = false; // gestisco lo stato di cambio lingua
  headerNascosto = false; // gestisco la visibilita' dell'header
  solo_brawser_blocca = false; // gestisco il blocco solo browser
  disabilitaLingua = false; // gestisco il blocco del cambio lingua
  headerPronto = false; // gestisco lo stato di prontezza dell'header
  headerSolido = false; // gestisco lo stato solido dell'header
  playerAperto = false; // gestisco lo stato del player aperto
  urlScheda = ''; // salvo l'URL della scheda corrente
  labelTornaCatalogo = ''; // salvo la label del ritorno al catalogo
  tipoSelezionato: 'film_serie' | 'film' | 'serie' = 'film_serie'; // salvo il tipo contenuto selezionato

  paginaLogin = false; // controllo se sono nella pagina login
  paginaIscrizione = false; // controllo se sono nella pagina iscrizione
  pagina404 = false; // controllo se sono nella pagina 404
  paginaContatti = false; // controllo se sono nella pagina contatti
  paginaPiano = false; // controllo se sono nella pagina piano
  paginaRicevute = false;

  authCorrente: Auth | null = null; // salvo lo stato auth corrente reale
  authVisuale: Auth | null = null; // salvo lo stato auth mostrato a schermo

  spinnerScroll$!: Observable<boolean>; // espongo lo stato dello spinner di scroll
  iconaLingua$!: Observable<string>; // espongo l'icona della lingua corrente

  readonly auth: HeaderAuthHelper; // uso l'helper per la logica auth
  readonly categorie: HeaderCategorieHelper; // uso l'helper per la logica categorie

  cambioLinguaService: CambioLinguaService; // salvo il riferimento al servizio lingua
  private readonly distruggi$ = new Subject<void>(); // uso questo subject per chiudere le subscribe
  private spinnerStart = 0; // salvo il timestamp di avvio dello spinner
  private readonly MIN_SPINNER = 300; // imposto la durata minima dello spinner

  constructor(
    private api: ApiService,
    private authService: Authservice,
    private cambioPianoAnimazione: CambioPianoAnimazioneService,
    private cambioRicevuteAnimazione: CambioRicevuteAnimazioneService,
    private router: Router,
    cambioLinguaService: CambioLinguaService,
    private translate: TranslateService,
    private http: HttpClient,
    private schedaPronta: SchedaProntaService,
    private location: Location,
    private tipoContenuto: TipoContenutoService,
    private statoSessione: StatoSessioneClientService,
    private erroreGlobale: ErroreGlobaleService,
    private transizioneTitolo: SchedaPlayerTransizioneTitoloService,
    public scorrimentoCatalogo: ScorrimentoCatalogoService,
    private audioGlobaleService: AudioGlobaleService,
    private contattiNav: ContattiNavigazioneService,
    private stopVideoGlobale: StopVideoGlobaleService,
  ) {
    this.cambioLinguaService = cambioLinguaService; // salvo il servizio lingua per usarlo nel componente
    this.tipoSelezionato = this.tipoContenuto.leggiTipo(); // leggo il tipo contenuto iniziale
    this.labelTornaCatalogo = this.isIt
      ? 'Ritorna al catalogo ⮨'
      : 'Back to catalog ⮨'; // imposto la label iniziale del ritorno al catalogo
    this.iconaLingua$ = cambioLinguaService.iconaLingua$; // espongo l'observable dell'icona lingua
    this.spinnerScroll$ = scorrimentoCatalogo.spinnerScroll$; // espongo l'observable dello spinner di scroll

    this.auth = new HeaderAuthHelper(
      api,
      authService,
      statoSessione,
      erroreGlobale,
      () => {
        this.mostraRicerca = false;
        this.menuCategorieAperto = false;
      }, // chiudo ricerca e menu categorie quando serve
      (v) => {
        this.menuUtenteAperto = v;
      }, // aggiorno l'apertura del menu utente
    );
    this.categorie = new HeaderCategorieHelper(api, () => this.isIt); // preparo l'helper categorie con la lingua corrente

    this.aggiornaFlagPagina(this.router.url || ''); // inizializzo i flag della pagina corrente

    this.router.events
      .pipe(
        takeUntil(this.distruggi$), // mi sgancio alla distruzione del componente
        filter((ev): ev is NavigationEnd => ev instanceof NavigationEnd), // tengo solo gli eventi finali di navigazione
      )
      .subscribe((ev: NavigationEnd) => {
        this.aggiornaFlagPagina(ev.urlAfterRedirects || ev.url); // aggiorno i flag con l'URL finale
        this.headerPronto = true; // segno l'header come pronto dopo la navigazione
        if (!this.paginaScheda()) this.headerSolido = false; // tolgo lo stato solido se non sono in scheda
      });

    this.authCorrente = this.authService.leggiObsAuth().value; // leggo subito lo stato auth corrente
    this.authVisuale = this.authCorrente; // allineo lo stato auth visuale a quello corrente
    this.authService
      .leggiObsAuth()
      .pipe(takeUntil(this.distruggi$)) // mi sgancio alla distruzione del componente
      .subscribe((auth: Auth) => {
        this.authCorrente = auth; // aggiorno sempre lo stato auth reale
        if (!this.auth.logoutInCorso) this.authVisuale = auth; // aggiorno lo stato visuale solo se non sono in logout
        if (auth?.tk) this.categorie.carica(); // carico le categorie se ho un token valido
      });

    cambioLinguaService.cambioLinguaAvviato$
      .pipe(takeUntil(this.distruggi$)) // mi sgancio alla distruzione del componente
      .subscribe(() => {
        this.spinnerStart = performance.now(); // salvo quando e' partito lo spinner lingua
        this.linguaInCambio = true; // attivo lo stato di cambio lingua
      });

    cambioLinguaService.cambioLinguaApplicata$
      .pipe(takeUntil(this.distruggi$)) // mi sgancio alla distruzione del componente
      .subscribe(() => {
        const restante = Math.max(
          this.MIN_SPINNER - (performance.now() - this.spinnerStart),
          0,
        ); // calcolo il tempo minimo ancora da attendere
        setTimeout(() => {
          this.linguaInCambio = false;
        }, restante + 1000); // spengo lo stato di cambio lingua con ritardo controllato
        if (this.authVisuale?.tk) this.categorie.carica(); // ricarico le categorie dopo il cambio lingua se sono loggato
      });
  }

  /**
   * Espone lo stato di logout in corso.
   *
   * @returns boolean True se il logout e' in corso, false altrimenti.
   */
  get logoutInCorso(): boolean {
    return this.auth.logoutInCorso; // leggo lo stato di logout dall'helper auth
  }

  /**
   * Espone le voci del menu categorie.
   *
   * @returns La lista delle voci disponibili nel menu categorie.
   */
  get vociCategorieMenu() {
    return this.categorie.voci; // leggo le voci dall'helper categorie
  }

  /**
   * Espone lo stato di caricamento del menu categorie.
   *
   * @returns Lo stato di caricamento delle categorie.
   */
  get caricamentoCategorieMenu() {
    return this.categorie.inCaricamento; // leggo lo stato di caricamento dall'helper categorie
  }

  /**
   * Verifica se la lingua corrente e' italiana.
   *
   * @returns boolean True se la lingua corrente e' italiana, false altrimenti.
   */
  get isIt(): boolean {
    return this.cambioLinguaService.leggiCodiceLingua() === 'it'; // controllo se il codice lingua corrente e' italiano
  }

  /**
   * Restituisce l'etichetta del tipo contenuto selezionato.
   *
   * @returns string L'etichetta localizzata del tipo selezionato.
   */
  get etichettaTipoSelezionato(): string {
    return this.etichettaTipo(this.tipoSelezionato); // calcolo l'etichetta del tipo attualmente selezionato
  }


  get chiaveRuolo(): string {
    const id = this.authVisuale?.idRuolo;
    return id ? `ui.ruolo.${id}` : '';
  }

  /**
   * Restituisce le opzioni di tipo non selezionate.
   *
   * @returns Array<'film_serie' | 'film' | 'serie'> Le opzioni disponibili diverse da quella selezionata.
   */
  get opzioniTipoNonSelezionate(): Array<'film_serie' | 'film' | 'serie'> {
    return (['film_serie', 'film', 'serie'] as const).filter(
      (x) => x !== this.tipoSelezionato,
    ); // tengo solo i tipi diversi da quello selezionato
  }

  /**
   * Gestisce le sottoscrizioni iniziali del componente.
   *
   * @returns void
   */
  ngOnInit(): void {
    if (this.authVisuale?.tk) this.categorie.carica(); // carico le categorie all'avvio se sono loggato

    this.audioGlobaleService.soloBlocca$
      .pipe(takeUntil(this.distruggi$)) // mi sgancio alla distruzione del componente
      .subscribe((v) => {
        this.solo_brawser_blocca = !!v;
      }); // aggiorno il flag di blocco browser

    this.schedaPronta.labelTorna$
      .pipe(takeUntil(this.distruggi$)) // mi sgancio alla distruzione del componente
      .subscribe((label) => {
        if (label) this.labelTornaCatalogo = label;
      }); // aggiorno la label di ritorno solo se presente

    this.schedaPronta.playerAperto$
      .pipe(takeUntil(this.distruggi$)) // mi sgancio alla distruzione del componente
      .subscribe((v) => {
        this.playerAperto = v;
      }); // aggiorno lo stato del player aperto

    this.schedaPronta.headerNascosto$
      .pipe(takeUntil(this.distruggi$)) // mi sgancio alla distruzione del componente
      .subscribe((v) => {
        this.headerNascosto = v;
      }); // aggiorno lo stato di visibilita dell'header

    this.schedaPronta.urlScheda$
      .pipe(takeUntil(this.distruggi$)) // mi sgancio alla distruzione del componente
      .subscribe((v) => {
        this.urlScheda = v;
      }); // aggiorno l'URL della scheda corrente
  }

  /**
   * Libera le risorse e chiude le sottoscrizioni del componente.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    this.auth.destroy(); // distruggo l'helper auth
    this.distruggi$.next(); // notifico la chiusura delle sottoscrizioni
    this.distruggi$.complete(); // completo il subject di distruzione
  }

  /**
   * Aggiorna lo stato solido dell'header durante lo scroll.
   *
   * @returns void
   */
  @HostListener('window:scroll')
  onScroll(): void {
    this.headerSolido = this.paginaScheda() ? window.scrollY > 10 : false; // rendo solido l'header solo in scheda e oltre la soglia di scroll
  }

  /**
   * Verifica se l'URL corrente corrisponde a una pagina scheda.
   *
   * @returns boolean True se la route corrente e' una scheda, false altrimenti.
   */
  paginaScheda(): boolean {
    return isPaginaScheda(this.router.url || ''); // delego il controllo alla utility URL
  }

  /**
   * Restituisce il path base del catalogo partendo dall'URL corrente.
   *
   * @returns string Il path base del catalogo.
   */
  baseCatalogoDaUrl(): string {
    return baseCatalogoDaUrl(
      this.location.path(true) || this.router.url || '', // passo il path corrente completo
      this.cambioLinguaService.leggiCodiceLingua(), // passo la lingua corrente
    );
  }

  /**
   * Costruisce il path catalogo in base al tipo contenuto selezionato.
   *
   * @param val Tipo contenuto da applicare al path.
   * @returns string Il path catalogo calcolato.
   */
  pathCatalogoDaTipo(val: TipoContenuto): string {
    return pathCatalogoDaTipo(this.baseCatalogoDaUrl(), val); // delego la costruzione del path alla utility
  }

  /**
   * Restituisce il prefisso lingua ricavato dall'URL corrente.
   *
   * @returns string Il prefisso lingua da usare nella navigazione.
   */
  prefissoLinguaDaUrl(): string {
    return prefissoLinguaDaUrl(
      this.location.path(true) || this.router.url || '', // passo il path corrente completo
      this.cambioLinguaService.leggiCodiceLingua(), // passo la lingua corrente
    );
  }

  /**
   * Costruisce il path della pagina login in base alla lingua corrente.
   *
   * @returns string Il path della pagina login.
   */
  pathLoginDaLingua(): string {
    return pathLoginDaLingua(
      this.location.path(true) || this.router.url || '', // passo il path corrente completo
      this.cambioLinguaService.leggiCodiceLingua(), // passo la lingua corrente
    );
  }

  /**
   * Restituisce l'etichetta localizzata del tipo contenuto.
   *
   * @param val Tipo contenuto da etichettare.
   * @returns string L'etichetta localizzata del tipo richiesto.
   */
  etichettaTipo(val: 'film_serie' | 'film' | 'serie'): string {
    if (val === 'film') return this.isIt ? 'Solo film' : 'Only Movies'; // restituisco l'etichetta del tipo film
    if (val === 'serie') return this.isIt ? 'Solo serie' : 'Only Series'; // restituisco l'etichetta del tipo serie
    return this.isIt ? 'Film e serie' : 'Movies and series'; // restituisco l'etichetta del tipo misto
  }

  /**
   * Avvia il cambio lingua se il componente non e' bloccato.
   *
   * @returns void
   */
  cambiaLingua(): void {
    if (this.auth.logoutInCorso || this.disabilitaLingua || this.linguaInCambio)
      return; // blocco il cambio lingua se non e' consentito
    this.cambioLinguaService.cambiaLingua(); // delego il cambio lingua al servizio
  }

  /**
   * Gestisce il click su una categoria.
   *
   * @returns void
   */
  onClickCategoria(): void {
    if (this.auth.logoutInCorso) return; // blocco l'azione se il logout e' in corso
    this.menuCategorieAperto = false; // chiudo il menu categorie
  }

  /**
   * Gestisce la selezione di una voce categoria.
   *
   * @param voce Voce selezionata dal menu categorie.
   * @returns void
   */
  onSelezionaCategoria(voce: {
    idCategoria: string;
    codice: string;
    label: string;
  }): void {
    if (this.auth.logoutInCorso) return; // blocco l'azione se il logout e' in corso
    this.menuCategorieAperto = false; // chiudo il menu categorie
    this.scorrimentoCatalogo.richiediScroll(voce.idCategoria); // richiedo lo scroll verso la categoria selezionata
  }

  /**
   * Gestisce la selezione del tipo contenuto.
   *
   * @param val Tipo contenuto selezionato.
   * @returns void
   */
  onSelezionaTipo(val: TipoContenuto): void {
    if (this.auth.logoutInCorso) return; // blocco l'azione se il logout e' in corso
    this.tipoSelezionato = val; // aggiorno il tipo selezionato
    this.menuTipoAperto = false; // chiudo il menu tipo
    this.tipoContenuto.impostaTipo(val); // salvo il tipo contenuto nel servizio
    this.location.go(this.pathCatalogoDaTipo(val)); // aggiorno l'URL del catalogo senza navigazione completa
  }

  /**
   * Gestisce il click sullo scollegamento.
   *
   * @returns void
   */
  onClickScollegati(): void {
    this.auth.onClickScollegati(); // delego il logout all'helper auth
  }

  /**
   * Gestisce il click verso la pagina contatti.
   *
   * @param event Evento del click da intercettare.
   * @returns void
   */
  onContattiClick(event: Event): void {
    event.preventDefault(); // blocco il comportamento predefinito del link
    this.contattiNav.vai(); // delego la navigazione contatti al servizio
  }
onCambiaPianoClick(): void {
    if (this.auth.logoutInCorso) return;
    this.cambioPianoAnimazione.apriPannelloPiano();
  }
  onRicevuteClick(): void {
    if (this.auth.logoutInCorso) return;
    this.cambioRicevuteAnimazione.apriRicevute();
  }
  /**
   * Gestisce il ritorno al catalogo dalla scheda o dal player.
   *
   * @param event Evento del click da intercettare.
   * @returns Promise<void>
   */
  async onTornaCatalogoClick(event: Event): Promise<void> {
    event.preventDefault(); // blocco il comportamento predefinito del link
    if (this.playerAperto) {
      this.schedaPronta.richiediFadeFilmPlayer(350); // richiedo il fade del player aperto
      await new Promise<void>((r) => setTimeout(r, 350)); // attendo la fine del fade del player
      this.schedaPronta.impostaPlayerAperto(false); // chiudo lo stato del player
      this.transizioneTitolo.ripristinaTitoloOrigineScheda(); // ripristino il titolo originale della scheda
    } else {
      await this.stopVideoGlobale.richiediSoloFadeAudio(350).catch(() => {}); // richiedo il solo fade audio se non ho il player aperto
    }
    this.router.navigateByUrl(this.baseCatalogoDaUrl()); // torno al catalogo calcolato dall'URL corrente
  }

  /**
   * Gestisce il ritorno alla scheda corrente.
   *
   * @returns void
   */
  tornaAllaScheda(): void {
    this.schedaPronta.richiediFadeEChiudi(); // richiedo fade e chiusura della vista corrente
  }

  /**
   * Aggiorna i flag della pagina in base all'URL corrente.
   *
   * @param url URL da analizzare.
   * @returns void
   */
  private aggiornaFlagPagina(url: string): void {
    this.paginaLogin =
      /^\/(it|en)\/(benvenuto|welcome)\/(login|accedi)(\/|$)/.test(url); // verifico se sono nella pagina login
    this.paginaIscrizione =
      /^\/(it|en)\/(benvenuto|welcome)\/(registrazione|registration)(\/|$)/.test(
        url,
      ); // verifico se sono nella pagina iscrizione
    this.pagina404 = /^\/(it|en)\/(non-trovato|not-found)(\/|$)/.test(url); // verifico se sono nella pagina 404
    this.paginaContatti = /^\/(it\/contatti|en\/contact)(\/|$)/.test(url); // verifico se sono nella pagina contatti
    this.paginaPiano = /^\/(it\/piano|en\/plan)(\/|$)/.test(url); // verifico se sono nella pagina piano
    this.paginaRicevute = /^\/(it\/ricevute|en\/receipts)(\/|$)/.test(url);
  }
}
