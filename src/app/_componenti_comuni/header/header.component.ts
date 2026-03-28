// ─── header.component.ts ─────────────────────────────────────────────────────
// Orchestratore puro: lifecycle, binding template, deleghe agli helper.

import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd }   from '@angular/router';
import { Subject, takeUntil, filter, Observable } from 'rxjs';
import { Location }                from '@angular/common';
import { TranslateService }        from '@ngx-translate/core';
import { HttpClient }              from '@angular/common/http';

import { Authservice }             from 'src/app/_benvenuto/login/_login_service/auth.service';
import { Auth }                    from 'src/app/_type/auth.type';
import { CambioLinguaService }     from 'src/app/_servizi_globali/cambio-lingua.service';
import { StatoSessioneClientService } from 'src/app/_servizi_globali/stato-sessione-client.service';
import { ErroreGlobaleService }    from 'src/app/_servizi_globali/errore-globale.service';
import { ApiService }              from 'src/app/_servizi_globali/api.service';
import { TipoContenuto, TipoContenutoService } from 'src/app/_catalogo/riga-categoria/categoria_services/tipo-contenuto.service';
import { SchedaPlayerTransizioneTitoloService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/scheda-player-transizione-titolo.service';
import { ScorrimentoCatalogoService } from 'src/app/_catalogo/riga-categoria/categoria_services/scorrimento-catalogo.service';
import { AudioGlobaleService }     from 'src/app/_servizi_globali/audio-globale.service';
import { ContattiNavigazioneService } from 'src/app/_servizi_globali/contatti-navigazione.service';
import { StopVideoGlobaleService } from 'src/app/_catalogo/riga-categoria/categoria_services/stop-video-globale.service';
import { SchedaProntaService }     from 'src/app/_catalogo/scheda/scheda_service/scheda-pronta.service';

import {
  prefissoLinguaDaUrl, baseCatalogoDaUrl,
  pathCatalogoDaTipo, pathLoginDaLingua, isPaginaScheda,
} from './header_utility/header-url.utils';
import { HeaderAuthHelper }        from './header_helpers/header-auth.helper';
import { HeaderCategorieHelper }   from './header_helpers/header-categorie.helper';

@Component({
  selector:    'app-header',
  templateUrl: './header.component.html',
  styleUrls:   ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {

  // ── UI state ─────────────────────────────────────────────────────────────
  mostraRicerca          = false;
  menuUtenteAperto       = false;
  menuCategorieAperto    = false;
  menuTipoAperto         = false;
  linguaInCambio         = false;
  headerNascosto         = false;
  solo_brawser_blocca    = false;
  disabilitaLingua       = false;
  headerPronto           = false;
  headerSolido           = false;
  playerAperto           = false;
  urlScheda              = '';
  labelTornaCatalogo     = '';
  tipoSelezionato: 'film_serie' | 'film' | 'serie' = 'film_serie';

  paginaLogin      = false;
  paginaIscrizione = false;
  pagina404        = false;
  paginaContatti   = false;

  // ── Auth ──────────────────────────────────────────────────────────────────
  authCorrente: Auth | null = null;
  authVisuale:  Auth | null = null;

  // ── Observables per il template ───────────────────────────────────────────
  spinnerScroll$!: Observable<boolean>;
  iconaLingua$!:   Observable<string>;

  // ── Helpers ───────────────────────────────────────────────────────────────
  readonly auth:       HeaderAuthHelper;
  readonly categorie:  HeaderCategorieHelper;

  // ── Getters delegati verso template ───────────────────────────────────────
  get logoutInCorso(): boolean  { return this.auth.logoutInCorso; }
  get vociCategorieMenu()       { return this.categorie.voci; }
  get caricamentoCategorieMenu(){ return this.categorie.inCaricamento; }

  // ── Internals ─────────────────────────────────────────────────────────────
  cambioLinguaService: CambioLinguaService;
  private readonly distruggi$ = new Subject<void>();
  private spinnerStart         = 0;
  private readonly MIN_SPINNER = 300;

  constructor(
    private api:               ApiService,
    private authService:       Authservice,
    private router:            Router,
    cambioLinguaService:       CambioLinguaService,
    private translate:         TranslateService,
    private http:              HttpClient,
    private schedaPronta:      SchedaProntaService,
    private location:          Location,
    private tipoContenuto:     TipoContenutoService,
    private statoSessione:     StatoSessioneClientService,
    private erroreGlobale:     ErroreGlobaleService,
    private transizioneTitolo: SchedaPlayerTransizioneTitoloService,
    public  scorrimentoCatalogo: ScorrimentoCatalogoService,
    private audioGlobaleService: AudioGlobaleService,
    private contattiNav:       ContattiNavigazioneService,
    private stopVideoGlobale:  StopVideoGlobaleService,
  ) {
    this.cambioLinguaService = cambioLinguaService;
    this.tipoSelezionato     = this.tipoContenuto.leggiTipo();
    this.labelTornaCatalogo  = this.isIt ? 'Ritorna al catalogo ⮨' : 'Back to catalog ⮨';
    this.iconaLingua$        = cambioLinguaService.iconaLingua$;
    this.spinnerScroll$      = scorrimentoCatalogo.spinnerScroll$;

    // ── Helpers ──────────────────────────────────────────────────────────
    this.auth = new HeaderAuthHelper(
      api, authService, statoSessione, erroreGlobale,
      () => { this.mostraRicerca = false; this.menuCategorieAperto = false; },
      (v) => { this.menuUtenteAperto = v; },
    );
    this.categorie = new HeaderCategorieHelper(api, () => this.isIt);

    // ── Pagine correnti ───────────────────────────────────────────────────
    this.aggiornaFlagPagina(this.router.url || '');

    // ── Router events ─────────────────────────────────────────────────────
    this.router.events
      .pipe(
        takeUntil(this.distruggi$),
        filter((ev): ev is NavigationEnd => ev instanceof NavigationEnd),
      )
      .subscribe((ev: NavigationEnd) => {
        this.aggiornaFlagPagina(ev.urlAfterRedirects || ev.url);
        this.headerPronto = true;
        if (!this.paginaScheda()) this.headerSolido = false;
      });

    // ── Auth ──────────────────────────────────────────────────────────────
    this.authCorrente = this.authService.leggiObsAuth().value;
    this.authVisuale  = this.authCorrente;
    this.authService.leggiObsAuth()
      .pipe(takeUntil(this.distruggi$))
      .subscribe((auth: Auth) => {
        this.authCorrente = auth;
        if (!this.auth.logoutInCorso) this.authVisuale = auth;
        if (auth?.tk) this.categorie.carica();
      });

    // ── Cambio lingua ─────────────────────────────────────────────────────
    cambioLinguaService.cambioLinguaAvviato$
      .pipe(takeUntil(this.distruggi$))
      .subscribe(() => {
        this.spinnerStart  = performance.now();
        this.linguaInCambio = true;
      });

    cambioLinguaService.cambioLinguaApplicata$
      .pipe(takeUntil(this.distruggi$))
      .subscribe(() => {
        const restante = Math.max(this.MIN_SPINNER - (performance.now() - this.spinnerStart), 0);
        setTimeout(() => { this.linguaInCambio = false; }, restante + 1000);
        if (this.authVisuale?.tk) this.categorie.carica();
      });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    if (this.authVisuale?.tk) this.categorie.carica();

    this.audioGlobaleService.soloBlocca$
      .pipe(takeUntil(this.distruggi$))
      .subscribe(v => { this.solo_brawser_blocca = !!v; });

    this.schedaPronta.labelTorna$
      .pipe(takeUntil(this.distruggi$))
      .subscribe(label => { if (label) this.labelTornaCatalogo = label; });

    this.schedaPronta.playerAperto$
      .pipe(takeUntil(this.distruggi$))
      .subscribe(v => { this.playerAperto = v; });

    this.schedaPronta.headerNascosto$
      .pipe(takeUntil(this.distruggi$))
      .subscribe(v => { this.headerNascosto = v; });

    this.schedaPronta.urlScheda$
      .pipe(takeUntil(this.distruggi$))
      .subscribe(v => { this.urlScheda = v; });
  }

  ngOnDestroy(): void {
    this.auth.destroy();
    this.distruggi$.next();
    this.distruggi$.complete();
  }

  // ── HostListeners ─────────────────────────────────────────────────────────
  @HostListener('window:scroll')
  onScroll(): void {
    this.headerSolido = this.paginaScheda() ? window.scrollY > 10 : false;
  }

  // ── Helpers URL (delegati alle utils) ─────────────────────────────────────
  paginaScheda(): boolean {
    return isPaginaScheda(this.router.url || '');
  }

  baseCatalogoDaUrl(): string {
    return baseCatalogoDaUrl(
      this.location.path(true) || this.router.url || '',
      this.cambioLinguaService.leggiCodiceLingua(),
    );
  }

  pathCatalogoDaTipo(val: TipoContenuto): string {
    return pathCatalogoDaTipo(this.baseCatalogoDaUrl(), val);
  }

  prefissoLinguaDaUrl(): string {
    return prefissoLinguaDaUrl(
      this.location.path(true) || this.router.url || '',
      this.cambioLinguaService.leggiCodiceLingua(),
    );
  }

  pathLoginDaLingua(): string {
    return pathLoginDaLingua(
      this.location.path(true) || this.router.url || '',
      this.cambioLinguaService.leggiCodiceLingua(),
    );
  }

  // ── Template API ──────────────────────────────────────────────────────────
  get isIt(): boolean {
    return this.cambioLinguaService.leggiCodiceLingua() === 'it';
  }

  get etichettaTipoSelezionato(): string { return this.etichettaTipo(this.tipoSelezionato); }

  get opzioniTipoNonSelezionate(): Array<'film_serie' | 'film' | 'serie'> {
    return (['film_serie', 'film', 'serie'] as const).filter(x => x !== this.tipoSelezionato);
  }

  etichettaTipo(val: 'film_serie' | 'film' | 'serie'): string {
    if (val === 'film')  return this.isIt ? 'Solo film'   : 'Only Movies';
    if (val === 'serie') return this.isIt ? 'Solo serie'  : 'Only Series';
    return this.isIt ? 'Film e serie' : 'Movies and series';
  }

  cambiaLingua(): void {
    if (this.auth.logoutInCorso || this.disabilitaLingua || this.linguaInCambio) return;
    this.cambioLinguaService.cambiaLingua();
  }

  onClickCategoria(): void {
    if (this.auth.logoutInCorso) return;
    this.menuCategorieAperto = false;
  }

  onSelezionaCategoria(voce: { idCategoria: string; codice: string; label: string }): void {
    if (this.auth.logoutInCorso) return;
    this.menuCategorieAperto = false;
    this.scorrimentoCatalogo.richiediScroll(voce.idCategoria);
  }

  onSelezionaTipo(val: TipoContenuto): void {
    if (this.auth.logoutInCorso) return;
    this.tipoSelezionato  = val;
    this.menuTipoAperto   = false;
    this.tipoContenuto.impostaTipo(val);
    this.location.go(this.pathCatalogoDaTipo(val));
  }

  onClickScollegati(): void { this.auth.onClickScollegati(); }

  onContattiClick(event: Event): void {
    event.preventDefault();
    this.contattiNav.vai();
  }

  async onTornaCatalogoClick(event: Event): Promise<void> {
    event.preventDefault();
    if (this.playerAperto) {
      this.schedaPronta.richiediFadeFilmPlayer(350);
      await new Promise<void>(r => setTimeout(r, 350));
      this.schedaPronta.impostaPlayerAperto(false);
      this.transizioneTitolo.ripristinaTitoloOrigineScheda();
    } else {
      await this.stopVideoGlobale.richiediSoloFadeAudio(350).catch(() => {});
    }
    this.router.navigateByUrl(this.baseCatalogoDaUrl());
  }

  tornaAllaScheda(): void { this.schedaPronta.richiediFadeEChiudi(); }

  // ── Privati ───────────────────────────────────────────────────────────────
  private aggiornaFlagPagina(url: string): void {
    this.paginaLogin      = /^\/(it|en)\/(benvenuto|welcome)\/(login|accedi)(\/|$)/.test(url);
    this.paginaIscrizione = /^\/(it|en)\/(benvenuto|welcome)\/(registrazione|registration)(\/|$)/.test(url);
    this.pagina404        = /^\/(it|en)\/(non-trovato|not-found)(\/|$)/.test(url);
    this.paginaContatti   = /^\/(it\/contatti|en\/contact)(\/|$)/.test(url);
  }
}
