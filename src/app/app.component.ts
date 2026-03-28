import { Component, OnInit, Inject, NgZone } from '@angular/core';
import { CambioLinguaService }    from './_servizi_globali/cambio-lingua.service';
import { TraduzioniService }      from './_servizi_globali/traduzioni.service';
import { ErroreGlobaleService }   from './_servizi_globali/errore-globale.service';
import { ToastService }           from './_servizi_globali/toast.service';
import { StatoSessioneClientService } from './_servizi_globali/stato-sessione-client.service';
import { TranslateService }       from '@ngx-translate/core';
import { Router, NavigationEnd }  from '@angular/router';
import { PerformanceService }     from './_servizi_globali/performance.service';
import { filter, take }           from 'rxjs/operators';
import { CaricamentoCaroselloService } from './_catalogo/carosello-novita/carosello_services/caricamento-carosello.service';
import { AnimateService }         from './_servizi_globali/animazioni_saturno/animate.service';
import { DOCUMENT }               from '@angular/common';
import gsap                       from 'gsap';
import { traduciSegmentiUrl }     from './_helpers_globali/helpers';
import { Authservice }            from 'src/app/_benvenuto/login/_login_service/auth.service';
import { TitoloPaginaService }    from './_servizi_globali/titolo-pagina.service';
import { SaturnoStatoService }    from './_servizi_globali/animazioni_saturno/saturno-stato.service';
import { SchedaProntaService }    from './_catalogo/scheda/scheda_service/scheda-pronta.service';
import {
  isFirefox, pulisciUrl, isCatalogoHome, isAreaCatalogo,
  leggiPathDaSessionStorage, salvaPathInSessionStorage, impostaLangHtml,
} from './_helpers_globali/helpers';
import {
  isRottaLogin, isRotta404, isRottaContatti, isRottaCatalogo,
} from './_helpers_globali/app-routes.utils';
import { AppToastService } from './_servizi_globali/app-toast.service';
import { AppLoaderService } from './_servizi_globali/app-loader.service';

@Component({
  selector:    'app-root',
  templateUrl: './app.component.html',
  styleUrls:   ['./app.component.scss'],
})
export class AppComponent implements OnInit {

  private pathPrecedenteSessioneAllAvvio = '';

  // Stream esposti al template
  traduzioniPronte$  = this.traduzioniService.traduzioniInizialiCaricate$;
  erroreFatale$      = this.erroreGlobaleService.erroreFatale$;
  sessioneVerificata$ = this.statoSessioneClient.sessioneVerificata$;
  saturnoPronto$     = this.saturnoStatoService.saturnoPronto$;
  caroselloPronto$   = this.caricamentoCaroselloService.caroselloPronto$;
  schedaPronta$      = this.schedaProntaService.schedaPronta$;

  // Getter che delegano all'AppLoaderService (usati dal template)
  get forzaLoaderExtra():    boolean { return this.appLoader.forzaLoaderExtra; }
  get loaderAvvioCatalogo(): boolean { return this.appLoader.loaderAvvioCatalogo; }
  get loaderDaMostrare():    boolean { return this.appLoader.loaderDaMostrare; }
  get caricamentoDisabilitato$() { return this.appLoader.caricamentoDisabilitato$; }
  get caricamentoDisabilitato():  boolean { return this.appLoader.caricamentoDisabilitato$.value; }
  get deveCaricareImmaginiCarosello$() { return this.appLoader.deveCaricareImmaginiCarosello$; }
  get deveCaricareImmaginiCarosello(): boolean { return this.appLoader.deveCaricareImmaginiCarosello$.value; }

  sonoIn404            = false;
  nascondiSfondoIn404  = false;
  ultimaUrl            = '';
  isFirefox            = false;
  chiaveToast404       = this.appToast.chiaveToast404;
  private appLoader:   AppLoaderService;

  constructor(
    private ngZone:                   NgZone,
    private cambioLinguaService:      CambioLinguaService,
    private traduzioniService:        TraduzioniService,
    private erroreGlobaleService:     ErroreGlobaleService,
    private toastService:             ToastService,
    private animateService:           AnimateService,
    private statoSessioneClient:      StatoSessioneClientService,
    private translate:                TranslateService,
    private saturnoStatoService:      SaturnoStatoService,
    private router:                   Router,
    private schedaProntaService:      SchedaProntaService,
    private caricamentoCaroselloService: CaricamentoCaroselloService,
    private titoloPaginaService:      TitoloPaginaService,
    private performanceService:       PerformanceService,
    private authService:              Authservice,
    private appToast:                 AppToastService,
    @Inject(DOCUMENT) private documento: Document,
  ) {
    this.appLoader = new AppLoaderService(
      erroreGlobaleService,
      traduzioniService,
      statoSessioneClient,
      saturnoStatoService,
    );
  }

  ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => { gsap.ticker.lagSmoothing(0); });

    this.isFirefox = isFirefox();
    const urlIniziale = this.router.url || '';

    // Contatti
    if (isRottaContatti(urlIniziale) && this.isLoggato())
      window.dispatchEvent(new CustomEvent('apri-dati-personali'));
    if (!isRottaContatti(urlIniziale))
      window.dispatchEvent(new CustomEvent('chiudi-dati-personali'));

    this.pathPrecedenteSessioneAllAvvio = leggiPathDaSessionStorage();
    this.appLoader.impostaPathPrecedente(this.pathPrecedenteSessioneAllAvvio);

    this.sonoIn404 = isRotta404(urlIniziale);
    this.aggiornaVisibilitaSfondo404();
    this.gestisciFadeInSfondo404();
    setTimeout(() => salvaPathInSessionStorage(urlIniziale), 0);

    if (isRotta404(urlIniziale)) this.appToast.mostraToast404Persistente();

    this.titoloPaginaService.avvia();
    this.performanceService.performanceLevel$
      .pipe(filter(l => l !== 'Calcolando...'), take(1))
      .subscribe(level => console.log('[Performance] Classificazione GPU:', level));

    impostaLangHtml(this.documento, this.cambioLinguaService.leggiCodiceLingua());
    this.ultimaUrl = urlIniziale;
    this.correggiPrefissoLingua(urlIniziale);

    this.cambioLinguaService.cambioLinguaApplicata$.subscribe(({ codice }) => {
      impostaLangHtml(this.documento, codice);
      if (this.sonoIn404) this.appToast.mostraToast404Persistente();
    });

    // Stato loader iniziale
    const disabilita =
      isRottaLogin(urlIniziale) || isRotta404(urlIniziale);
    this.appLoader.caricamentoDisabilitato$.next(disabilita);

    const deveCaricare = isCatalogoHome(urlIniziale);
    this.appLoader.deveCaricareImmaginiCarosello$.next(deveCaricare);
    if (deveCaricare) this.caricamentoCaroselloService.resetta();

    // Router events
    this.router.events
      .pipe(filter(ev => ev instanceof NavigationEnd))
      .subscribe((ev: any) => {
        const url = ev?.urlAfterRedirects || ev?.url || '';
        this.correggiPrefissoLingua(url);

        if (!isRottaContatti(url))
          window.dispatchEvent(new CustomEvent('chiudi-dati-personali'));
        if (isRottaContatti(url) && this.isLoggato())
          window.dispatchEvent(new CustomEvent('apri-dati-personali'));

        this.sonoIn404 = isRotta404(url);
        const precedente = this.ultimaUrl;
        this.ultimaUrl   = url;
        salvaPathInSessionStorage(url);
        this.aggiornaVisibilitaSfondo404();
        this.gestisciFadeInSfondo404();

        if (isRottaLogin(url)) this.toastService.chiudi('toast_benvenuto');
        if (isRotta404(url))   { this.erroreGlobaleService.resettaErroreFatale(); this.appToast.mostraToast404Persistente(); }
        if (!isRotta404(url))  this.toastService.chiudi(this.chiaveToast404);

        const vengoDaContatti = (() => {
          try { return sessionStorage.getItem('vengo_da_contatti') === 'true'; } catch { return false; }
        })();
        const eroInContatti = isRottaContatti(precedente);

        const disabilitaLoader =
          isRottaLogin(url) ||
          isRotta404(url) ||
          (isRottaCatalogo(url) && (isRottaLogin(precedente) || isRotta404(precedente) || (vengoDaContatti && eroInContatti))) ||
          (eroInContatti && isRotta404(precedente));

        this.appLoader.caricamentoDisabilitato$.next(disabilitaLoader);

        const deve = isCatalogoHome(url);
        this.appLoader.deveCaricareImmaginiCarosello$.next(deve);
        if (deve && !isAreaCatalogo(precedente)) this.caricamentoCaroselloService.resetta();
      });

  this.appToast.gestisciToastBenvenuto();
    this.appToast.gestisciErroriFatali();
    this.appLoader.avvia(
      this.caricamentoCaroselloService.caroselloPronto$,
      this.schedaProntaService,
      () => {},
    );
  }

  mostraToast404Persistente(): void {
    this.appToast.mostraToast404Persistente();
  }

  aggiornaVisibilitaSfondo404(): void {
    const raw  = leggiPathDaSessionStorage();
    const path = raw.replace(/^\/+/, '');
    const vieneDaCatalogo = path.startsWith('it/catalogo') || path.startsWith('en/catalog');
    this.nascondiSfondoIn404 = this.sonoIn404 && vieneDaCatalogo;
  }

  gestisciFadeInSfondo404(): void {
    if (this.nascondiSfondoIn404) {
      this.animateService.fadeInSoloSfondo(1.85);
    }
  }

  private correggiPrefissoLingua(url: string): void {
    const match = url.match(/^\/(it|en)(\/|$)/);
    if (!match) return;

    const langNelUrl = match[1];
    const langSalvata = this.cambioLinguaService.leggiCodiceLingua();
    let urlCorretto = url;

    if (langNelUrl !== langSalvata)
      urlCorretto = urlCorretto.replace(/^\/(it|en)/, '/' + langSalvata);

    urlCorretto = traduciSegmentiUrl(urlCorretto, langSalvata as 'it' | 'en');
    if (urlCorretto === url) return;

    this.router.navigateByUrl(urlCorretto, { replaceUrl: true });
  }

  private isLoggato(): boolean {
    return !!this.authService.leggiObsAuth().value?.tk;
  }
}
