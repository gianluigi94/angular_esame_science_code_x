  import {
    Component,
    OnDestroy,
    OnInit,
    AfterViewInit,
    ElementRef,
    QueryList,
    ViewChildren,
    HostListener,
    ViewChild,
  } from '@angular/core';
  import { Subscription, take, skip, distinctUntilChanged, forkJoin } from 'rxjs';
  import { ApiService } from 'src/app/_servizi_globali/api.service';
  import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
  import { CatalogoRoutingUtility } from './catalogo_utility/catalogo-routing.utility';
  import { CatalogoPreloadUtility } from './catalogo_utility/catalogo-preload.utility';
  import { CatalogoCaricamentoUtility } from './catalogo_utility/catalogo-caricamento.utility';
  import { CatalogoSentinellaUtility } from './catalogo_utility/catalogo-sentinella.utility';
  import {
    TipoContenuto,
    TipoContenutoService,
  } from '../app-riga-categoria/categoria_services/tipo-contenuto.service';
  import { Router } from '@angular/router';
  import { CatalogoSessionStorageUtility } from './catalogo_utility/catalogo-session-storage.utility';
  import { Location } from '@angular/common';
  import { CatalogoScrollCategoriaUtility } from './catalogo_utility/catalogo-scroll-categoria.utility';
  import { AnimazioniScomparsaService } from 'src/app/_catalogo/app-riga-categoria/categoria_services/animazioni-scomparsa.service';
  import { ScorrimentoCatalogoService } from '../app-riga-categoria/categoria_services/scorrimento-catalogo.service';
  import { CatalogoCacheService } from '../app-riga-categoria/categoria_services/catalogo-cache.service';
  import { RigaCategoriaComponent } from '../app-riga-categoria/riga-categoria.component';
  import { SchedaCacheService } from '../scheda/scheda_service/scheda-cache.service';
    @Component({
    selector: 'app-catalogo',
    templateUrl: './catalogo.component.html',
    styleUrls: ['./catalogo.component.scss'],
  })
  export class CatalogoComponent implements OnInit, AfterViewInit, OnDestroy {
    constructor(
      public api: ApiService,
      public tipoContenuto: TipoContenutoService,
      public router: Router,
      public location: Location,
      public cambioLingua: CambioLinguaService,
      public schedaCache: SchedaCacheService,
      public cacheCatalogo: CatalogoCacheService,
      public servizioAnimazioni: AnimazioniScomparsaService,
      public scorrimentoCatalogo: ScorrimentoCatalogoService,
    ) {}

    tickResetPagine = 0;
    timerCambioTipo: any = 0;
    sottoscrizioni = new Subscription();
    idCicloRighe = 0;
    timerCaricaFino: any = 0;
    tokenScroll = 0;
    limiteRighe = 4;
    offsetRighe = 0;
    haAltreRighe = true;
    hoFinitoTutto = false;
    caricamentoRighe = false;

    timerSentinella: any = 0;
    osservatoreSentinella: IntersectionObserver | null = null;
    sentinellaPronta = false;
    utenteHaScrollato = false;
    scrollYPrimaCambio = 0;
    timerAutoScrollSessione: any = 0;
  autoScrollSessioneEseguito = false;
    cinqueElementi = Array(5).fill(0);

    locandinaDemo = 'assets/locandine_it/locandina_it_abbraccia_il_vento.webp';
  locandineDemo: { src: string; titolo: string; sottotitolo: string; tipo: string; id_media: string }[] = Array(8).fill(0).map(() => ({
        src: this.locandinaDemo,
        titolo: '',
        sottotitolo: '',
        tipo: '',
      id_media: '',
      }));

  righeDemo: { idCategoria: string; category: string; locandine: { src: string; titolo: string; sottotitolo: string; tipo: string; id_media: string }[] }[] = [];
    tipoSelezionato: TipoContenuto = 'film_serie';

    @ViewChild('sentinella', { read: ElementRef })
    sentinella!: ElementRef;

  @ViewChildren('rigaCatalogo', { read: ElementRef })
  righeCatalogo!: QueryList<ElementRef>;

  @ViewChildren('rigaCatalogo')
  righeComponenti!: QueryList<RigaCategoriaComponent>;

    ngAfterViewInit(): void {
      this.servizioAnimazioni.inizializzaAnimazioni(this.righeCatalogo);
      this.righeCatalogo.changes.subscribe(() => {
    this.servizioAnimazioni.inizializzaAnimazioni(this.righeCatalogo);
  });
      this.inizializzaOsservatoreSentinella();
    }

    @HostListener('wheel', ['$event'])
    gestisciRotellina(evento: WheelEvent): void {
      this.utenteHaScrollato = true;
      this.servizioAnimazioni.gestisciWheel(evento);
    }

    ngOnInit(): void {
        try {
      const da404 = sessionStorage.getItem('transizione_404_catalogo') === '1';
      // lo lascio solo se mi serve immediatamente in questo ingresso
      // se vuoi comportamento ultra rigoroso, puoi non toccarlo qui e farlo consumare solo da SaturnoService
    } catch {}
      this.tipoSelezionato = this.tipoContenuto.leggiTipo();
      this.forzaRottaCatalogoDaLinguaETipo();
          const lingua = this.cambioLingua.leggiCodiceLingua();
      if (this.cacheCatalogo.valida(lingua, this.tipoSelezionato)) {
        this.righeDemo = this.cacheCatalogo.righeDemo.slice();
        this.offsetRighe = this.cacheCatalogo.offsetRighe;
        this.haAltreRighe = this.cacheCatalogo.haAltreRighe;
        this.hoFinitoTutto = this.cacheCatalogo.hoFinitoTutto;
        requestAnimationFrame(() => {
          window.scrollTo(0, this.cacheCatalogo.scrollY || 0);
          this.sentinellaPronta = this.haAltreRighe && !this.hoFinitoTutto;
          if (this.sentinellaPronta) this.inizializzaOsservatoreSentinella();
          this.provaAutoScrollDaSessionStorage();
        });
      } else {
        this.caricaPrimeRigheDaApi(0, false);
        this.provaAutoScrollDaSessionStorage();
      }
      this.sottoscrizioni.add(
        this.scorrimentoCatalogo.richieste$.subscribe((idCategoria: string) => {
          this.gestisciScrollACategoria(idCategoria);
        }),
      );
    this.sottoscrizioni.add(
        this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
          this.cacheCatalogo.svuota();
          this.schedaCache.svuota();
          this.forzaRottaCatalogoDaLinguaETipo(false);
          this.caricaPrimeRigheDaApi(0, false);
        }),
      );

      this.sottoscrizioni.add(
        this.tipoContenuto.tipoSelezionato$
          .pipe(distinctUntilChanged(), skip(1))
          .subscribe((tipo) => {
            this.cacheCatalogo.svuota();
            this.pulisciStoricoScrollOrizzontaleDaSessionStorage();
            this.tipoSelezionato = tipo;
            this.tickResetPagine += 1;
            this.avviaCambioTipoConAttese();
            this.forzaRottaCatalogoDaLinguaETipo(true);
          }),
      );
    }

    ngOnDestroy(): void {
          this.cacheCatalogo.righeDemo = this.righeDemo.slice();
      this.cacheCatalogo.offsetRighe = this.offsetRighe;
      this.cacheCatalogo.haAltreRighe = this.haAltreRighe;
      this.cacheCatalogo.hoFinitoTutto = this.hoFinitoTutto;
      this.cacheCatalogo.tipo = this.tipoSelezionato;
      this.cacheCatalogo.lingua = this.cambioLingua.leggiCodiceLingua();
      this.cacheCatalogo.scrollY = window.scrollY || 0;
      this.sottoscrizioni.unsubscribe();
      try {
        this.servizioAnimazioni.disconnettiOsservatori();
      } catch {}
      if (this.timerCambioTipo) {
        clearTimeout(this.timerCambioTipo);
        this.timerCambioTipo = 0;
      }
      if (this.timerSentinella) {
        clearTimeout(this.timerSentinella);
        this.timerSentinella = 0;
      }
      if (this.timerCaricaFino) {
        clearTimeout(this.timerCaricaFino);
        this.timerCaricaFino = 0;
      }
        if (this.timerAutoScrollSessione) {
      clearTimeout(this.timerAutoScrollSessione);
      this.timerAutoScrollSessione = 0;
    }
      try {
        this.osservatoreSentinella?.disconnect();
      } catch {}
      this.osservatoreSentinella = null;
    }

    tracciaRigaCategoria(_indice: number, riga: { idCategoria: string }): string {
      return riga.idCategoria;
    }

     baseCatalogoDaLingua(): string {
   return CatalogoRoutingUtility.baseCatalogoDaLingua(this);
 }

     sottoPathDaTipo(val: TipoContenuto): string {
   return CatalogoRoutingUtility.sottoPathDaTipo(this, val);
 }

     forzaRottaCatalogoDaLinguaETipo(preservaBaseDaUrl: boolean = false): void {
   CatalogoRoutingUtility.forzaRottaCatalogoDaLinguaETipo(this, preservaBaseDaUrl);
 }





     precaricaImmaginiRighe(
   righe: { locandine: { src: string }[] }[],
 ): Promise<void> {
   return CatalogoPreloadUtility.precaricaImmaginiRighe(righe);
 }

     aggiornaRigheInPlace(
   nuoveRighe: { idCategoria: string; category: string; posters: string[] }[],
 ): void {
   CatalogoPreloadUtility.aggiornaRigheInPlace(this, nuoveRighe);
 }

     aggiornaLocandineInPlace(target: string[], sorgente: string[]): void {
   CatalogoPreloadUtility.aggiornaLocandineInPlace(target, sorgente);
 }

    avviaCambioTipoConAttese(): void {
      if (this.timerCambioTipo) {
        clearTimeout(this.timerCambioTipo);
        this.timerCambioTipo = 0;
      }

      this.idCicloRighe += 1;
      const id = this.idCicloRighe;

      this.tipoContenuto.notificaCambioTipoAvviato(this.tipoSelezionato, id);

      this.timerCambioTipo = setTimeout(() => {
        this.timerCambioTipo = 0;
        this.caricaPrimeRigheDaApi(id, true);
      }, 100);
    }

     inizializzaOsservatoreSentinella(): void {
   CatalogoSentinellaUtility.inizializzaOsservatoreSentinella(this);
 }

     caricaPrimeRigheDaApi(
   idForzato: number = 0,
   notificaTipoApplicato: boolean = false,
 ): void {
   CatalogoCaricamentoUtility.caricaPrimeRigheDaApi(
     this,
     idForzato,
     notificaTipoApplicato,
   );
 }

     caricaAltreQuattroRigheDaApi(): void {
   CatalogoCaricamentoUtility.caricaAltreQuattroRigheDaApi(this);
 }

   gestisciScrollACategoria(idCategoria: string): void {
   CatalogoScrollCategoriaUtility.gestisciScrollACategoria(this, idCategoria);
 }

    caricaFinoACategoria(idCategoria: string, token: number): Promise<boolean> {
   return CatalogoCaricamentoUtility.caricaFinoACategoria(
     this,
     idCategoria,
     token,
   );
 }

     forzaControlloSentinella(): void {
   CatalogoSentinellaUtility.forzaControlloSentinella(this);
 }

     leggiCategoriaDaSessionStorage(): string {
   return CatalogoSessionStorageUtility.leggiCategoriaDaSessionStorage();
 }

   pulisciCategoriaDaSessionStorage(): void {
   CatalogoSessionStorageUtility.pulisciCategoriaDaSessionStorage();
 }

   pulisciStoricoScrollOrizzontaleDaSessionStorage(): void {
   CatalogoSessionStorageUtility.pulisciStoricoScrollOrizzontaleDaSessionStorage();
 }

   provaAutoScrollDaSessionStorage(): void {
   CatalogoSessionStorageUtility.provaAutoScrollDaSessionStorage(this);
 }

  leggiScrollOrizzontalePerCategoriaDaSessionStorage(idCategoria: string): { idCategoria: string; pagina: number } | null {
   return CatalogoSessionStorageUtility.leggiScrollOrizzontalePerCategoriaDaSessionStorage(idCategoria);
 }


  applicaScrollOrizzontaleInizialePerCategoria(idCategoria: string): { eseguito: boolean; idCategoria: string; pagina: number } | null {
   return CatalogoSessionStorageUtility.applicaScrollOrizzontaleInizialePerCategoria(this, idCategoria);
 }

 salvaScrollOrizzontaleInSessionStorage(idCategoria: string, pagina: number): void {
   CatalogoSessionStorageUtility.salvaScrollOrizzontaleInSessionStorage(idCategoria, pagina);
 }
  }
