// ─── scheda.component.ts ─────────────────────────────────────────────────────
// Orchestratore puro: inizializza gli helper, gestisce il lifecycle Angular,
// delega tutta la logica di business agli helper.

import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, HostListener,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location }               from '@angular/common';
import { Subscription, forkJoin } from 'rxjs';
import { take }                   from 'rxjs/operators';
import { TranslateService }       from '@ngx-translate/core';
import { ApiService }             from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService }    from 'src/app/_servizi_globali/cambio-lingua.service';
import { AudioGlobaleService }    from 'src/app/_servizi_globali/audio-globale.service';
import { TitoloPaginaService }    from 'src/app/_servizi_globali/titolo-pagina.service';
import { SchedaProntaService }    from './scheda_service/scheda-pronta.service';
import { SchedaCacheService }     from './scheda_service/scheda-cache.service';
import { StopVideoGlobaleService } from '../riga-categoria/categoria_services/stop-video-globale.service';
import { SchedaPlayerTransizioneTitoloService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/scheda-player-transizione-titolo.service';

import { SchedaStateContext }    from './scheda_utility/scheda-state.context';
import {
  costruisciUrlTrailer, imgTitoloDaSlug, sfondoDaDescrizione,
  slugDaDescrizione, secondiInLeggibile as secondiInLeggibileUtil,
} from './scheda_utility/scheda-url.utils';
import { SchedaAudioHelper }     from './scheda_helpers/scheda-audio.helper';
import { SchedaTrailerHelper }   from './scheda_helpers/scheda-trailer.helper';
import { SchedaStagioniHelper }  from './scheda_helpers/scheda-stagioni.helper';
import { SchedaLabelsHelper }    from './scheda_helpers/scheda-labels.helper';
import { SchedaCorrelateHelper, RigaCorrelata } from './scheda_helpers/scheda-correlate.helper';

export interface Episodio {
  titolo: string; descrizione: string; anteprima: string; durata: string;
}

@Component({
  selector:    'app-scheda',
  templateUrl: './scheda.component.html',
  styleUrls:   ['./scheda.component.scss'],
})
export class SchedaComponent implements OnInit, OnDestroy, AfterViewInit {

  // ── Dati del contenuto (letti dal template) ────────────────────────────────
  descrizione          = '';
  descrizioneTestuale  = '';
  titoloScheda         = '';
  urlSfondoScheda      = '';
  imgTitoloScheda      = '';
  anno:         number | null = null;
  durata:       number | null = null;
  episodiTotali: number | null = null;
  regista       = '';

  // ── Animazioni ────────────────────────────────────────────────────────────
  startAnim            = false;
  startAnimTitolo      = false;
  startAnimDescrizione = false;
  segnale_cambio       = false;

  // ── Flag di sincronizzazione loader ───────────────────────────────────────
  private _loaderNascosto  = false;
  private _sfondoPronto    = false;
  private _titoloPronto    = false;
  private _descPronta      = false;
  private _tabellaPronta   = false;
  private _labelPronte     = false;
  private _primaNavigazione = true;

  // ── Prefetch cambio lingua ────────────────────────────────────────────────
  private _prefetchTitoloPromise: Promise<string> | null = null;
  private _prefetchDescPromise:   Promise<string> | null = null;
  private _preloadTitoloPromise:  Promise<void>   | null = null;
  private _nuovoTitoloPrecaricato = '';
  private _paramRiproduzioneInAttesa:  string | null = null;
  private _stagioneRiproduzioneInAttesa: string | null = null;

  // ── Player film/serie ─────────────────────────────────────────────────────
  mostraPlayerVideo    = false;
  transitioneVersoPLayer = false;
  risorsePLayerVideo: { auto: string; '1080': string; '720': string; '360': string } | null = null;
  sottotitoliPlayerVideo: { en: string; it: string } | null = null;
  infoEpisodioPlayer: { stagione: number; episodio: number } | null = null;

  // ── Stato helpers esposto al template via getter ───────────────────────────
  get mostraVideoScheda():        boolean { return this.ctx.mostraVideoScheda; }
  get mostraPlayerSchedaNelDom(): boolean { return this.ctx.mostraPlayerSchedaNelDom; }
  get trailerInRiproduzione():    boolean { return this.ctx.trailerInRiproduzione; }
  get audioBloccatoDaUtente():    boolean { return this.ctx.audioBloccatoDaUtente; }
  get soloBrowserBlocca():        boolean { return this.ctx.soloBrowserBlocca; }
  get stagioneSelezionata():      string | null { return this.ctx.stagioneSelezionata; }
  get stagioni() { return this.ctx.stagioni; }
  get serieData() { return this.ctx.serieData; }
  get tipoContenuto() { return this.ctx.tipoContenuto; }
  get durataFadeSchedaMs() { return this.ctx.durataFadeSchedaMs; }
  get caricamentoStagioneInCorso(): boolean { return this.stagioniHelper.caricamentoStagioneInCorso; }
  readonly secondiInLeggibile = secondiInLeggibileUtil;
  get righeCorrelate():     RigaCorrelata[] { return this.correlateHelper.righeCorrelate; }
  get righeCorrelateInCaricamento(): boolean { return this.correlateHelper.righeCorrelateInCaricamento; }
  // Labels
  get labelRiprendi()       { return this.labelsHelper.labelRiprendi; }
  get labelRiproduci()      { return this.labelsHelper.labelRiproduci; }
  get labelRiprendiTitle()  { return this.labelsHelper.labelRiprendiTitle; }
  get labelRiproduciTitle() { return this.labelsHelper.labelRiproduciTitle; }
  get labelTrailerTitle()   { return this.labelsHelper.labelTrailerTitle; }
  get labelAnno()           { return this.labelsHelper.labelAnno; }
  get labelDurata()         { return this.labelsHelper.labelDurata; }
  get labelRegista()        { return this.labelsHelper.labelRegista; }
  get labelEpisodiTotali()  { return this.labelsHelper.labelEpisodiTotali; }
  get labelStagione()       { return this.labelsHelper.labelStagione; }
  get labelEpisodio()       { return this.labelsHelper.labelEpisodio; }
  get altSfondoScheda()     { return this.labelsHelper.altSfondoScheda; }
  get altTitoloScheda()     { return this.labelsHelper.altTitoloScheda; }

  // ── Helper instances ──────────────────────────────────────────────────────
  private readonly ctx:            SchedaStateContext;
  private readonly audioHelper:    SchedaAudioHelper;
  private readonly trailerHelper:  SchedaTrailerHelper;
  private readonly stagioniHelper: SchedaStagioniHelper;
  private readonly labelsHelper:   SchedaLabelsHelper;
  private readonly correlateHelper: SchedaCorrelateHelper;
  private readonly subs = new Subscription();

  constructor(
    private route:            ActivatedRoute,
    private router:           Router,
    private location:         Location,
    private api:              ApiService,
    private translate:        TranslateService,
    private schedaCache:      SchedaCacheService,
    private cambioLingua:     CambioLinguaService,
    private schedaPronta:     SchedaProntaService,
    private audioGlobaleService: AudioGlobaleService,
    private stopVideoGlobale: StopVideoGlobaleService,
    private transizioneTitolo: SchedaPlayerTransizioneTitoloService,
    private titoloPagina:     TitoloPaginaService,
  ) {
    this.ctx = new SchedaStateContext();

    this.audioHelper = new SchedaAudioHelper(
      this.ctx,
      audioGlobaleService,
      () => this.trailerHelper.resettaPerNuovoAvvio(),
      () => {},
    );

    this.trailerHelper = new SchedaTrailerHelper(
      this.ctx,
      this.audioHelper,
      audioGlobaleService,
      () => this.cambioLingua.leggiCodiceLingua(),
      () => this.labelsHelper.aggiornaTrailerTitle(),
    );

    this.stagioniHelper = new SchedaStagioniHelper(
      this.ctx, api, cambioLingua, location,
    );

    this.labelsHelper = new SchedaLabelsHelper(
      translate,
      titoloPagina,
      cambioLingua,
      () => this.titoloScheda,
      () => this.ctx.trailerInRiproduzione,
      () => this.ctx.distrutto,
    );

    this.correlateHelper = new SchedaCorrelateHelper(
      api, cambioLingua,
      () => this.ctx.idContenuto,
      () => this.ctx.tipoContenuto,
    );
  }

  // ── ViewChild player trailer scheda ───────────────────────────────────────
  private _playerSchedaRef: ElementRef | null = null;
  @ViewChild('playerSchedaRef')
  set playerSchedaRef(ref: ElementRef | undefined) {
    this._playerSchedaRef = ref ?? null;
    if (ref) this.trailerHelper.inizializzaDaRef(ref);
  }

  ngAfterViewInit(): void {}

  // ── HostListeners ─────────────────────────────────────────────────────────
  @HostListener('window:popstate')
  gestisciPopState(): void {
    if (this.mostraPlayerVideo) {
      this.mostraPlayerVideo       = false;
      this.transitioneVersoPLayer  = false;
      this.schedaPronta.impostaPlayerAperto(false);
      this.transizioneTitolo.ripristinaTitoloOrigineScheda();
    }
  }

  @HostListener('window:blur')
  gestisciBlurFinestra(): void {
    if (!this.ctx.playerScheda || !this.ctx.mostraVideoScheda) return;
    this.ctx.avvioTrailerSchedaRichiesto = false;
    if (this.ctx.timerMostraVideoScheda) {
      clearTimeout(this.ctx.timerMostraVideoScheda);
      this.ctx.timerMostraVideoScheda = null;
    }
    this.ctx.mostraVideoScheda = false;
    this.audioHelper.sfumaGuadagnoVerso(0, this.ctx.durataFadeSchedaMs).finally(() => {
      try { this.ctx.playerScheda?.pause?.(); } catch {}
      try { this.ctx.playerScheda?.currentTime?.(0); } catch {}
    });
  }

  @HostListener('window:focus')
  gestisciFocusFinestra(): void {
    if (!this.ctx.trailerInRiproduzione) return;
    if (!this.ctx.playerScheda) return;
    if (this.ctx.mostraPlayerSchedaNelDom && this.ctx.playerSchedaPronto)
      this.trailerHelper.richiediAvvio(true);
  }

  // ── Template API ──────────────────────────────────────────────────────────
  toggleTrailer(): void {
    if (this.ctx.trailerInRiproduzione) {
      this.ctx.trailerInRiproduzione = false;
      if (this.ctx.timerInserisciPlayerSchedaNelDom) {
        clearTimeout(this.ctx.timerInserisciPlayerSchedaNelDom);
        this.ctx.timerInserisciPlayerSchedaNelDom = null;
      }
      if (this.ctx.timerMostraVideoScheda) {
        clearTimeout(this.ctx.timerMostraVideoScheda);
        this.ctx.timerMostraVideoScheda = null;
      }
      this.ctx.avvioTrailerSchedaRichiesto = false;
      if (this.ctx.mostraVideoScheda) {
        this.ctx.mostraVideoScheda = false;
        this.audioHelper.sfumaGuadagnoVerso(0, this.ctx.durataFadeSchedaMs)
          .finally(() => this.trailerHelper.resettaPerNuovoAvvio());
      }
      this.labelsHelper.aggiornaTrailerTitle();
    } else {
      this.ctx.trailerInRiproduzione = true;
      if (this.ctx.mostraPlayerSchedaNelDom && this.ctx.playerSchedaPronto) {
        this.trailerHelper.richiediAvvio(true);
        this.labelsHelper.aggiornaTrailerTitle();
      } else {
        this.trailerHelper.programmaInserimento();
      }
    }
  }

  onRiproduci(): void    { this.avviaTransizionePlayer(); }
  onClicEpisodio(n: number): void { this.avviaTransizionePlayer(n); }

  async selezionaStagione(n: string): Promise<void> {
    await this.stagioniHelper.selezionaStagione(n);
  }

  tracciaRigaCorrelata = (_i: number, riga: { idCategoria: string }): string =>
    this.correlateHelper.tracciaRigaCorrelata(_i, riga);

  getChiavi(obj: Record<string, any>): string[] { return Object.keys(obj); }
  toString(val: any): string                    { return String(val); }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    if (this.schedaPronta.loaderGlobalmenteNascosto) {
      this._loaderNascosto = true;
    } else {
      window.addEventListener('loader-hidden', this.onLoaderHidden, { once: true });
    }

    this.subs.add(
      this.audioGlobaleService.statoAudio$.subscribe(consentito => {
        this.ctx.audioBloccatoDaUtente = !consentito;
        if (this.ctx.audioBloccatoDaUtente) {
          this.ctx.soloBrowserBlocca = false;
          try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {}
          this.audioHelper.rimuoviSbloccoAudioScheda();
          try { this.audioHelper.inizializzaWebAudio(); } catch {}
          this.audioHelper.sfumaGuadagnoVerso(0, this.ctx.durataFadeSchedaMs)
            .finally(() => { try { this.ctx.playerScheda?.muted?.(true); } catch {} });
          return;
        }
        try { this.audioHelper.inizializzaWebAudio(); } catch {}
        try {
          if (this.ctx.contestoAudio?.state === 'suspended')
            this.ctx.contestoAudio.resume().catch(() => {});
        } catch {}
        try { this.audioHelper.sfumaGuadagnoVerso(1, 80); } catch {}
        try { this.ctx.playerScheda?.muted?.(false); } catch {}
        if (this.ctx.mostraVideoScheda) this.trailerHelper.proseguiAvvio();
        else                            this.trailerHelper.sincronizzaAvvio();
      }),
    );

    // Leggi state router iniziale
    const navState       = this.router.getCurrentNavigation()?.extras?.state ?? history.state;
    const urlDaState     = String(navState?.['urlSfondo']           || '').trim();
    const imgTitoloDaState = String(navState?.['urlImgTitolo']      || '').trim();
    const descDaState    = String(navState?.['descrizioneTestuale']  || '').trim();
    const tabellaDaState = navState?.['tabellaDati'] ?? null;
    if (urlDaState)     { this.urlSfondoScheda = urlDaState;     this._sfondoPronto = true; }
    if (imgTitoloDaState) { this.imgTitoloScheda = imgTitoloDaState; this._titoloPronto = true; }
    if (descDaState)    { this.descrizioneTestuale = descDaState; this._descPronta = true; }
    if (tabellaDaState) this.applicaTabellaDaState(tabellaDaState);

    this.setupCambioLinguaSubscriptions();
    this.setupParamMapSubscription();

    this.subs.add(
      this.stopVideoGlobale.osservaRichiesteFadeAudio$().subscribe(({ durataMs, done }) => {
        if (!this.ctx.playerScheda || !this.ctx.mostraVideoScheda) { done(); return; }
        this.audioHelper.sfumaGuadagnoVerso(0, durataMs).finally(() => done());
      }),
    );
    this.subs.add(
      this.stopVideoGlobale.osservaRichiesteChiusuraPlayerScheda$().subscribe(({ durataMs, done }) => {
        this.trailerHelper.chiudiConFadeEReset(durataMs).finally(() => done());
      }),
    );
    this.subs.add(
      this.schedaPronta.chiudiPlayer$.subscribe(() => {
        this.mostraPlayerVideo      = false;
        this.transitioneVersoPLayer = false;
        this.schedaPronta.impostaPlayerAperto(false);
        this.schedaPronta.impostaHeaderNascosto(false);
        this.transizioneTitolo.ripristinaTitoloOrigineScheda();
        const pathPulito = this.location.path(true).split('?')[0];
        this.location.replaceState(pathPulito);
        this.startAnim = false; this.startAnimTitolo = false; this.startAnimDescrizione = false;
        requestAnimationFrame(() => {
          this.startAnim = true; this.startAnimTitolo = true; this.startAnimDescrizione = true;
        });
      }),
    );
  }

  ngOnDestroy(): void {
    this.ctx.distrutto = true;
    if (this.ctx.tipoContenuto && this.ctx.idContenuto) {
      const lingua = this.cambioLingua.leggiCodiceLingua();
      this.schedaCache.set(this.ctx.tipoContenuto, this.ctx.idContenuto, lingua, {
        descrizione: this.descrizione,
        descrizioneTestuale: this.descrizioneTestuale,
        urlSfondoScheda: this.urlSfondoScheda,
        imgTitoloScheda: this.imgTitoloScheda,
        anno: this.anno,
        durata: this.durata,
        titoloScheda: this.titoloScheda,
        episodiTotali: this.episodiTotali,
        regista: this.regista,
        slugCorrente: this.ctx.slugCorrente,
        stagioni: this.ctx.stagioni,
        stagioneSelezionata: this.ctx.stagioneSelezionata,
        serieData: this.ctx.serieData,
        righeCorrelate: this.correlateHelper.righeCorrelate,
      });
    }
    this.subs.unsubscribe();
    window.removeEventListener('loader-hidden', this.onLoaderHidden);
    this.trailerHelper.clearAllTimers();
    this.labelsHelper.clearRetryTimer();
    this.audioHelper.rimuoviSbloccoAudioScheda();
    try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {}
    const p = this.ctx.playerScheda;
    this.audioHelper.sfumaGuadagnoVerso(0, this.ctx.durataFadeSchedaMs)
      .finally(() => { try { if (p) p.dispose(); } catch {} });
  }

  // ── Setup subscriptions ───────────────────────────────────────────────────
  private setupCambioLinguaSubscriptions(): void {
    this.subs.add(
      this.cambioLingua.cambioLinguaAvviato$.subscribe((codice: string) => {
        if (this.ctx.tipoContenuto === 'serie')
          this.stagioniHelper.caricamentoStagioneInCorso = true;
        if (this.ctx.slugCorrente) {
          const url = imgTitoloDaSlug(this.ctx.slugCorrente, codice);
          this._nuovoTitoloPrecaricato = url;
          this._preloadTitoloPromise   = new Promise<void>(resolve => {
            const img = new Image(); img.onload = img.onerror = () => resolve(); img.src = url;
          });
        } else {
          this._nuovoTitoloPrecaricato = '';
          this._preloadTitoloPromise   = Promise.resolve();
        }
        if (this.ctx.idContenuto && this.ctx.tipoContenuto) {
          const fetch$ = this.ctx.tipoContenuto === 'film'
            ? this.api.getFilmTraduzioni(this.ctx.idContenuto, codice)
            : this.api.getSerieTraduzioni(this.ctx.idContenuto, codice);
          let resolveDesc!: (v: string) => void, resolveTitolo!: (v: string) => void;
          this._prefetchDescPromise   = new Promise<string>(r => resolveDesc   = r);
          this._prefetchTitoloPromise = new Promise<string>(r => resolveTitolo = r);
          fetch$.pipe(take(1)).subscribe({
            next:  res => { resolveDesc(String(res?.data?.descrizione || '')); resolveTitolo(String(res?.data?.titolo || '')); },
            error: ()  => { resolveDesc(''); resolveTitolo(''); },
          });
        } else {
          this._prefetchDescPromise   = Promise.resolve('');
          this._prefetchTitoloPromise = Promise.resolve('');
        }
      }),
    );

    this.subs.add(
      this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
        const lingua = this.cambioLingua.leggiCodiceLingua();
        const nuovoTitolo = this.ctx.slugCorrente
          ? imgTitoloDaSlug(this.ctx.slugCorrente, lingua)
          : this.imgTitoloScheda;
        const trailerEraAttivo =
          this.ctx.trailerInRiproduzione &&
          (this.ctx.mostraVideoScheda || this.ctx.mostraPlayerSchedaNelDom || !!this.ctx.timerMostraVideoScheda);

        const continuaDopoFade = () => {
          if (!this.ctx.idContenuto || !this.ctx.tipoContenuto) {
            this.startAnimTitolo = false;
            this.imgTitoloScheda = nuovoTitolo;
            requestAnimationFrame(() => requestAnimationFrame(() => this.startAnimTitolo = true));
            return;
          }
          const descP   = this._prefetchDescPromise   ?? Promise.resolve('');
          const titoloP = this._prefetchTitoloPromise ?? Promise.resolve('');
          this._prefetchDescPromise = null; this._prefetchTitoloPromise = null;
          Promise.all([descP, titoloP]).then(([nuovaDesc, nuovoTitoloScheda]) => {
            this.titoloScheda = nuovoTitoloScheda;
            this.labelsHelper.aggiornaAltSfondo();
            const preP    = this._preloadTitoloPromise ?? Promise.resolve();
            const urlTit  = this._nuovoTitoloPrecaricato || nuovoTitolo;
            this._preloadTitoloPromise = null; this._nuovoTitoloPrecaricato = '';
            preP.then(() => {
              this.startAnimTitolo = false; this.startAnimDescrizione = false;
              this.descrizioneTestuale = nuovaDesc;
              const img2 = new Image();
              img2.onload = img2.onerror = () => {
                this.imgTitoloScheda = urlTit;
                requestAnimationFrame(() => requestAnimationFrame(() => {
                  this.segnale_cambio = true;
                  this.labelsHelper.commitLabelUISincronizzate();
                  this.schedaPronta.impostaLabelTorna(
                    lingua === 'it' ? 'Ritorna al catalogo ⮨' : 'Back to catalog ⮨'
                  );
                  this.startAnimTitolo = true; this.startAnimDescrizione = true;
                }));
              };
              img2.src = urlTit;
            });
            this.correlateHelper.caricaRigheCorrelate(false);
            if (this.ctx.tipoContenuto === 'serie' && this.ctx.stagioneSelezionata) {
              this.ctx.stagioneCachata.clear(); this.ctx.serieData = {};
              this.stagioniHelper.selezionaStagione(this.ctx.stagioneSelezionata);
            }
            if (trailerEraAttivo && this.ctx.slugCorrente)
              this.trailerHelper.programmaInserimento();
          });
        };

        if (trailerEraAttivo)
          this.trailerHelper.chiudiConFadeEReset(350).finally(() => continuaDopoFade());
        else
          continuaDopoFade();
      }),
    );
  }

  private setupParamMapSubscription(): void {
    this.route.paramMap.subscribe((pm) => {
      const idRaw = pm.get('id');
      const id    = idRaw ? Number(idRaw) : NaN;
      if (!idRaw || Number.isNaN(id)) return;

      this.schedaPronta.reset();
      this.resetStatoScheda();

      if (this._primaNavigazione) {
        const sp = new URLSearchParams(window.location.search);
        this._paramRiproduzioneInAttesa = sp.get('riproduzione') || sp.get('play') || null;
        if (this._paramRiproduzioneInAttesa)
          this._stagioneRiproduzioneInAttesa = pm.get('stagione') || null;
      }
      this._primaNavigazione = false;

      // Rileggi state
      const ns       = history.state;
      const urlS     = String(ns?.['urlSfondo']          || '').trim();
      const imgS     = String(ns?.['urlImgTitolo']       || '').trim();
      const descS    = String(ns?.['descrizioneTestuale']|| '').trim();
      const tabS     = ns?.['tabellaDati'] ?? null;
      if (urlS)  { this.urlSfondoScheda  = urlS; this._sfondoPronto = true; }
      if (imgS)  { this.imgTitoloScheda  = imgS; this._titoloPronto = true; }
      if (descS) { this.descrizioneTestuale = descS; this._descPronta = true; }
      if (tabS)  this.applicaTabellaDaState(tabS);

      this.ctx.idContenuto  = id;
      this.ctx.tipoContenuto = this.leggiTipoDaUrl();
      this.verificaEAvviaAnimazioni();

      // Cache
      const lingua = this.cambioLingua.leggiCodiceLingua();
      const cached = this.ctx.tipoContenuto
        ? this.schedaCache.get(this.ctx.tipoContenuto, id, lingua) : null;
      if (cached) {
        this.ripristinaDaCache(cached);
        return;
      }

      if (this.ctx.tipoContenuto === 'film') this.caricaFilm(id);
      if (this.ctx.tipoContenuto === 'serie') this.caricaSerie(id, pm);
    });
  }

  // ── Logica avvio player film/serie ────────────────────────────────────────
  private avviaTransizionePlayer(episodio?: number): void {
    if (!this.ctx.slugCorrente) return;
    const BASE = 'https://d2kd3i5q9rl184.cloudfront.net/streaming';
    const slug = this.ctx.slugCorrente;

    if (this.ctx.tipoContenuto === 'film') {
      this.risorsePLayerVideo = {
        auto:   `${BASE}/film/${slug}/master.m3u8`,
        '1080': `${BASE}/film/${slug}/1080/with-audio.m3u8`,
        '720':  `${BASE}/film/${slug}/720/with-audio.m3u8`,
        '360':  `${BASE}/film/${slug}/360/with-audio.m3u8`,
      };
      this.sottotitoliPlayerVideo = {
        en: `assets/sottotitoli/en/film/${slug}.vtt`,
        it: `assets/sottotitoli/it/film/${slug}.vtt`,
      };
    } else if (this.ctx.tipoContenuto === 'serie' && episodio != null) {
      const stagione = this.ctx.stagioneSelezionata ?? '1';
      this.risorsePLayerVideo = {
        auto:   `${BASE}/serie/${slug}/stagione_${stagione}/e${episodio}/master.m3u8`,
        '1080': `${BASE}/serie/${slug}/stagione_${stagione}/e${episodio}/1080/with-audio.m3u8`,
        '720':  `${BASE}/serie/${slug}/stagione_${stagione}/e${episodio}/720/with-audio.m3u8`,
        '360':  `${BASE}/serie/${slug}/stagione_${stagione}/e${episodio}/360/with-audio.m3u8`,
      };
      this.sottotitoliPlayerVideo = {
        en: `assets/sottotitoli/en/serie/${slug}.vtt`,
        it: `assets/sottotitoli/it/serie/${slug}.vtt`,
      };
      this.infoEpisodioPlayer = { stagione: Number(stagione), episodio };
    }

    if (this.ctx.trailerInRiproduzione) {
      this.ctx.avvioTrailerSchedaRichiesto = false;
      this.ctx.trailerInRiproduzione       = false;
      this.labelsHelper.aggiornaTrailerTitle();
      if (this.ctx.mostraVideoScheda) {
        this.ctx.mostraVideoScheda = false;
        this.audioHelper.sfumaGuadagnoVerso(0, this.ctx.durataFadeSchedaMs)
          .finally(() => this.trailerHelper.smontaSubito());
      } else {
        this.trailerHelper.smontaSubito();
      }
    }

    const valore   = episodio ? `ep${episodio}` : 'true';
    const lingua   = this.cambioLingua.leggiCodiceLingua();
    const nomeP    = lingua === 'it' ? 'riproduzione' : 'play';
    const pathC    = this.location.path(true).split('?')[0];
    window.history.pushState(null, '', `${pathC}?${nomeP}=${valore}`);
    this.schedaPronta.impostaUrlScheda(pathC);
    this.schedaPronta.impostaPlayerAperto(true);
    this.schedaPronta.impostaHeaderNascosto(true);
    this.mostraPlayerVideo       = true;
    this.transitioneVersoPLayer  = true;
    this.transizioneTitolo.animaTitoloVersocentro();
  }

  // ── Helpers privati caricamento dati ──────────────────────────────────────
  private caricaFilm(id: number): void {
    this.api.getFilm(id).subscribe(res => {
      this.descrizione         = String(res?.data?.descrizione || '');
      this.ctx.slugCorrente    = slugDaDescrizione(this.descrizione);
      this.anno                = res?.data?.anno   ?? null;
      this.durata              = res?.data?.durata ?? null;
      this.regista             = String(res?.data?.regista || '');
      this.episodiTotali       = null;
      if (!this.urlSfondoScheda)  { this.urlSfondoScheda  = sfondoDaDescrizione(this.descrizione); }
      if (!this.imgTitoloScheda)  { this.imgTitoloScheda  = imgTitoloDaSlug(this.ctx.slugCorrente, this.cambioLingua.leggiCodiceLingua()); }
      this._sfondoPronto = this._titoloPronto = this._tabellaPronta = true;
      this.verificaEAvviaAnimazioni();
      this.correlateHelper.caricaRigheCorrelate();
      if (this.ctx.slugCorrente && !this._paramRiproduzioneInAttesa)
        this.trailerHelper.programmaInserimento();
    });
    this.api.getFilmTraduzioni(id, this.cambioLingua.leggiCodiceLingua()).subscribe(res => {
      this.descrizioneTestuale = String(res?.data?.descrizione || '');
      this.titoloScheda        = String(res?.data?.titolo      || '');
      this.labelsHelper.aggiornaAltSfondo();
      this._descPronta = true;
      this.verificaEAvviaAnimazioni();
    });
  }

  private caricaSerie(id: number, pm: any): void {
    const lingua       = this.cambioLingua.leggiCodiceLingua();
    const stagioneDaUrl = pm.get('stagione') ? Number(pm.get('stagione')) : 1;

    this.api.getSerieTraduzioni(id, lingua).subscribe(res => {
      this.descrizioneTestuale = String(res?.data?.descrizione || '');
      this.titoloScheda        = String(res?.data?.titolo      || '');
      this.labelsHelper.aggiornaAltSfondo();
      this._descPronta = true;
      this.verificaEAvviaAnimazioni();
    });

    forkJoin([this.api.getSerie(id), this.api.getStagioni(id)]).subscribe(([resSerie, resStagioni]: [any, any]) => {
      this.descrizione         = String(resSerie?.data?.descrizione || '');
      this.ctx.slugCorrente    = slugDaDescrizione(this.descrizione);
      this.anno                = resSerie?.data?.anno           ?? null;
      this.episodiTotali       = resSerie?.data?.numero_episodi ?? null;
      this.regista             = String(resSerie?.data?.regista || '');
      this.durata              = null;
      if (!this.urlSfondoScheda) { this.urlSfondoScheda = sfondoDaDescrizione(this.descrizione); }
      if (!this.imgTitoloScheda) { this.imgTitoloScheda = imgTitoloDaSlug(this.ctx.slugCorrente, lingua); }
      this._sfondoPronto = this._titoloPronto = this._tabellaPronta = true;

      const lista: any[] = Array.isArray(resStagioni?.data) ? resStagioni.data : [];
      this.ctx.stagioni = lista.map(s => ({
        id_stagione: s.id_stagione, numero_stagione: s.numero_stagione, numero_episodi: s.numero_episodi,
      }));

      if (this._paramRiproduzioneInAttesa?.startsWith('ep')) {
        const epR   = Number(this._paramRiproduzioneInAttesa.replace('ep', ''));
        const stagN = Number(this._stagioneRiproduzioneInAttesa ?? '1');
        const si    = this.ctx.stagioni.find(s => s.numero_stagione === stagN);
        if (!si || epR < 1 || epR > si.numero_episodi) {
          const c = this.cambioLingua.leggiCodiceLingua();
          this.router.navigateByUrl(`/${c}/${c === 'it' ? 'non-trovato' : 'not-found'}`); return;
        }
      }

      this.verificaEAvviaAnimazioni();
      this.correlateHelper.caricaRigheCorrelate();
      if (this.ctx.slugCorrente && !this._paramRiproduzioneInAttesa)
        this.trailerHelper.programmaInserimento();

      if (this.ctx.stagioni.length > 0) {
        const explicit = !!pm.get('stagione');
        const target   = this.ctx.stagioni.find(s => s.numero_stagione === stagioneDaUrl);
        if (!target && explicit) {
          const c = this.cambioLingua.leggiCodiceLingua();
          this.router.navigateByUrl(`/${c}/${c === 'it' ? 'non-trovato' : 'not-found'}`); return;
        }
        const stagione  = target ?? this.ctx.stagioni[0];
        const targetStr = String(stagione.numero_stagione);
        this.stagioniHelper.aggiornaUrlStagione(targetStr);
        this.stagioniHelper.caricaEpisodiStagione(stagione.id_stagione, targetStr)
          .then(() => { this.ctx.stagioneSelezionata = targetStr; });
      }
    });
  }

  private ripristinaDaCache(cached: any): void {
    this.descrizione         = cached.descrizione;
    this.descrizioneTestuale = cached.descrizioneTestuale;
    this.urlSfondoScheda     = cached.urlSfondoScheda;
    this.imgTitoloScheda     = cached.imgTitoloScheda;
    this.anno                = cached.anno;
    this.durata              = cached.durata;
    this.episodiTotali       = cached.episodiTotali;
    this.regista             = cached.regista;
    this.titoloScheda        = cached.titoloScheda ?? '';
    this.ctx.slugCorrente    = cached.slugCorrente;
    this.ctx.stagioni        = cached.stagioni;
    this.ctx.stagioneSelezionata = cached.stagioneSelezionata;
    this.ctx.serieData       = cached.serieData;
    for (const k of Object.keys(cached.serieData)) this.ctx.stagioneCachata.add(k);
    this._sfondoPronto = this._titoloPronto = this._descPronta = this._tabellaPronta = true;
    this.labelsHelper.aggiornaAltSfondo();
    if (this.ctx.tipoContenuto === 'serie' && this.ctx.stagioneSelezionata)
      this.stagioniHelper.aggiornaUrlStagione(this.ctx.stagioneSelezionata);
    this.correlateHelper.righeCorrelate = cached.righeCorrelate ?? [];
    this.correlateHelper.righeCorrelateInCaricamento = false;
    this.verificaEAvviaAnimazioni();
    if (this.ctx.slugCorrente && !this._paramRiproduzioneInAttesa)
      this.trailerHelper.programmaInserimento();
  }

  private applicaTabellaDaState(t: any): void {
    this.anno          = t.anno           ?? null;
    this.durata        = t.durata         ?? null;
    this.episodiTotali = t.numero_episodi ?? null;
    this.regista       = String(t.regista || '');
    this._tabellaPronta = true;
  }

  private resetStatoScheda(): void {
    this.startAnim = this.startAnimTitolo = this.startAnimDescrizione = false;
    this.ctx.avvioTrailerSchedaRichiesto = false;
    this.ctx.trailerInRiproduzione = true;
    this._sfondoPronto = this._titoloPronto = this._descPronta = this._tabellaPronto = this._labelPronte = false;
    this.urlSfondoScheda = this.imgTitoloScheda = this.descrizioneTestuale = '';
    this.titoloScheda    = this.descrizione     = this.ctx.slugCorrente    = '';
    this.labelsHelper.altSfondoScheda = this.labelsHelper.altTitoloScheda = '';
    this.labelsHelper.labelRiprendiTitle = this.labelsHelper.labelRiproduciTitle = this.labelsHelper.labelTrailerTitle = '';
    this.anno = this.durata = this.episodiTotali = null; this.regista = '';
    this.ctx.stagioni = []; this.ctx.serieData = {}; this.ctx.stagioneSelezionata = null; this.ctx.stagioneCachata.clear();
    this.correlateHelper.reset();
    window.scrollTo(0, 0);
  }

  private verificaEAvviaAnimazioni(): void {
    const tuttoPronto =
      this._loaderNascosto && this._sfondoPronto && this._titoloPronto &&
      this._descPronta && this._tabellaPronta;
    if (!tuttoPronto) return;

    const _param = this._paramRiproduzioneInAttesa;
    this._paramRiproduzioneInAttesa = null;
    if (_param && !this.mostraPlayerVideo) {
      const ep = _param.startsWith('ep') ? Number(_param.replace('ep', '')) : undefined;
      if (this._stagioneRiproduzioneInAttesa) {
        this.ctx.stagioneSelezionata = this._stagioneRiproduzioneInAttesa;
        this._stagioneRiproduzioneInAttesa = null;
      }
      this.avviaTransizionePlayer(ep);
      this.schedaPronta.segnaPronte();
      if (!this._labelPronte) {
        this._labelPronte = true;
        this.labelsHelper.commitLabelUISincronizzate();
      }
      return;
    }

    if (!this._labelPronte) {
      this._labelPronte = true;
      this.labelsHelper.commitLabelUISincronizzate().then(() => {
        if (this.ctx.distrutto) return;
        this.schedaPronta.segnaPronte();
        requestAnimationFrame(() => {
          this.startAnim = this.startAnimTitolo = this.startAnimDescrizione = true;
        });
      });
      return;
    }

    this.schedaPronta.segnaPronte();
    requestAnimationFrame(() => {
      this.startAnim = this.startAnimTitolo = this.startAnimDescrizione = true;
    });
  }

  leggiTipoDaUrl(): 'film' | 'serie' | null {
    const segs   = this.route.snapshot.url.map(s => s.path);
    const parent = this.route.parent?.snapshot.url.map(s => s.path) || [];
    const all    = [...parent, ...segs].join('/');
    if (/(^|\/)(film|movies)(\/|$)/.test(all))  return 'film';
    if (/(^|\/)(serie|series)(\/|$)/.test(all)) return 'serie';
    return null;
  }

  private onLoaderHidden = () => {
    this._loaderNascosto = true;
    this.verificaEAvviaAnimazioni();
  };

  // Workaround TS strict: il getter _tabellaPronto usa il campo privato
  private get _tabellaPronto(): boolean { return this._tabellaPronta; }
  private set _tabellaPronto(v: boolean) { this._tabellaPronta = v; }
}
