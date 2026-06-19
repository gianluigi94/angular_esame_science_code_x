// Componente orchestratore della scheda che inizializza gli helper, gestisce il lifecycle Angular e delega la logica operativa.

import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription, forkJoin } from 'rxjs';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { take } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { StatoPagamentoService } from 'src/app/_servizi_globali/stato-pagamento.service';
import { ToastService } from 'src/app/_servizi_globali/toast.service';
import { AudioGlobaleService } from 'src/app/_servizi_globali/audio-globale.service';
import { TitoloPaginaService } from 'src/app/_servizi_globali/titolo-pagina.service';
import { SchedaProntaService } from './scheda_service/scheda-pronta.service';
import { SchedaCacheService } from './scheda_service/scheda-cache.service';
import { StopVideoGlobaleService } from '../riga-categoria/categoria_services/stop-video-globale.service';
import { SchedaPlayerTransizioneTitoloService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/scheda-player-transizione-titolo.service';

import { SchedaStateContext } from './scheda_utility/scheda-state.context';
import {
  costruisciUrlTrailer,
  imgTitoloDaSlug,
  sfondoDaDescrizione,
  slugDaDescrizione,
  secondiInLeggibile as secondiInLeggibileUtil,
} from './scheda_utility/scheda-url.utils';
import { SchedaAudioHelper } from './scheda_helpers/scheda-audio.helper';
import { SchedaTrailerHelper } from './scheda_helpers/scheda-trailer.helper';
import { SchedaStagioniHelper } from './scheda_helpers/scheda-stagioni.helper';
import { SchedaLabelsHelper } from './scheda_helpers/scheda-labels.helper';
import {
  SchedaCorrelateHelper,
  RigaCorrelata,
} from './scheda_helpers/scheda-correlate.helper';

export interface Episodio {
  titolo: string;
  descrizione: string;
  anteprima: string;
  durata: string;
  chiaveArchivio: string;
}

@Component({
  selector: 'app-scheda',
  templateUrl: './scheda.component.html',
  styleUrls: ['./scheda.component.scss'],
})
export class SchedaComponent implements OnInit, OnDestroy, AfterViewInit {
  descrizione = ''; // la descrizione semantica del contenuto
  descrizioneTestuale = ''; // la descrizione testuale da mostrare
  titoloScheda = ''; // il titolo della scheda
  urlSfondoScheda = ''; // l'URL dello sfondo della scheda
  imgTitoloScheda = ''; // l'URL dell'immagine titolo della scheda
  anno: number | null = null; // l'anno del contenuto
  durata: number | null = null; // la durata del contenuto
  episodiTotali: number | null = null; // il numero totale di episodi
  regista = ''; // il nome del regista

  startAnim = false; // segno se devo avviare l'animazione generale
  startAnimTitolo = false; // segno se devo avviare l'animazione del titolo
  startAnimDescrizione = false; // segno se devo avviare l'animazione della descrizione
  segnale_cambio = false;
  pagamentoFallito = false; // segno se e' avvenuto un cambio da propagare alla UI

  private _loaderNascosto = false; // segno se il loader globale e' gia' sparito
  private _sfondoPronto = false; // segno se lo sfondo e' pronto
  private _titoloPronto = false; // segno se il titolo grafico e' pronto
  private _descPronta = false; // segno se la descrizione e' pronta
  private _tabellaPronta = false; // segno se i dati tabellari sono pronti
  private _labelPronte = false; // segno se le label UI sono pronte
  private _primaNavigazione = true; // segno se sono ancora alla prima navigazione della scheda

  private _prefetchTitoloPromise: Promise<string> | null = null; // la promise del prefetch titolo tradotto
  private _prefetchDescPromise: Promise<string> | null = null; // la promise del prefetch descrizione tradotta
  private _preloadTitoloPromise: Promise<void> | null = null; // la promise del preload immagine titolo
  private _nuovoTitoloPrecaricato = ''; // l'URL del nuovo titolo gia' precaricato
  private _paramRiproduzioneInAttesa: string | null = null; // l'eventuale parametro play in attesa
  private _stagioneRiproduzioneInAttesa: string | null = null; // l'eventuale stagione letta insieme al play

  mostraPlayerVideo = false; // segno se il player film o serie e' visibile
  transitioneVersoPLayer = false; // segno se e' in corso la transizione verso il player
  risorsePLayerVideo: {
    auto: string;
    '1080': string;
    '720': string;
    '360': string;
  } | null = null; // le risorse HLS del player principale
  sottotitoliPlayerVideo: { en: string; it: string } | null = null; // i sottotitoli del player principale
  infoEpisodioPlayer: { stagione: number; episodio: number } | null = null; // le info episodio del player serie
  mostraModaleEliminaStagione = false;
  eliminazioneStagioneInCorso = false;
  categorieFileEliminazioneStagione: Record<string, boolean> = {};
  stagioneDaEliminare: {
    idSerie: number;
    idStagione: number;
    numeroStagione: number;
  } | null = null;

  mostraModaleEliminaEpisodio = false;
  eliminazioneEpisodioInCorso = false;
  categorieFileEliminazioneEpisodio: Record<string, boolean> = {};
  episodioDaEliminare: {
    idSerie: number;
    chiaveArchivio: string;
    numeroEpisodio: number;
  } | null = null;

  // Getter che mi restituisce questo valore in modo comodo nel template.
  get mostraVideoScheda(): boolean {
    return this.ctx.mostraVideoScheda;
  } // espongo la visibilita' del video trailer
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get mostraPlayerSchedaNelDom(): boolean {
    return this.ctx.mostraPlayerSchedaNelDom;
  } // espongo la presenza del player trailer nel DOM
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get trailerInRiproduzione(): boolean {
    return this.ctx.trailerInRiproduzione;
  } // espongo lo stato del trailer
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get audioBloccatoDaUtente(): boolean {
    return this.ctx.audioBloccatoDaUtente;
  } // espongo il blocco audio scelto dall'utente
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get soloBrowserBlocca(): boolean {
    return this.ctx.soloBrowserBlocca;
  } // espongo il blocco audio dovuto solo al browser
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get stagioneSelezionata(): string | null {
    return this.ctx.stagioneSelezionata;
  } // espongo la stagione selezionata
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get stagioni() {
    return this.ctx.stagioni;
  } // espongo la lista stagioni
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get serieData() {
    return this.ctx.serieData;
  } // espongo i dati serie raggruppati per stagione
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get tipoContenuto() {
    return this.ctx.tipoContenuto;
  } // espongo il tipo contenuto corrente
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get durataFadeSchedaMs() {
    return this.ctx.durataFadeSchedaMs;
  } // espongo la durata fade della scheda
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get caricamentoStagioneInCorso(): boolean {
    return this.stagioniHelper.caricamentoStagioneInCorso;
  } // espongo lo stato di caricamento stagione
  readonly secondiInLeggibile = secondiInLeggibileUtil; // espongo la utility di formattazione durata
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get righeCorrelate(): RigaCorrelata[] {
    return this.correlateHelper.righeCorrelate;
  } // espongo le righe correlate
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get righeCorrelateInCaricamento(): boolean {
    return this.correlateHelper.righeCorrelateInCaricamento;
  } // espongo lo stato di caricamento correlate
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get labelRiprendi() {
    return this.labelsHelper.labelRiprendi;
  } // espongo la label riprendi
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get labelRiproduci() {
    return this.labelsHelper.labelRiproduci;
  } // espongo la label riproduci
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get labelRiprendiTitle() {
    return this.labelsHelper.labelRiprendiTitle;
  } // espongo il title di riprendi
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get labelRiproduciTitle() {
    return this.labelsHelper.labelRiproduciTitle;
  } // espongo il title di riproduci
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get labelTrailerTitle() {
    return this.labelsHelper.labelTrailerTitle;
  } // espongo il title del trailer
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get labelAnno() {
    return this.labelsHelper.labelAnno;
  } // espongo la label anno
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get labelDurata() {
    return this.labelsHelper.labelDurata;
  } // espongo la label durata
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get labelRegista() {
    return this.labelsHelper.labelRegista;
  } // espongo la label regista
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get labelEpisodiTotali() {
    return this.labelsHelper.labelEpisodiTotali;
  } // espongo la label episodi totali
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get labelStagione() {
    return this.labelsHelper.labelStagione;
  } // espongo la label stagione
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get labelEpisodio() {
    return this.labelsHelper.labelEpisodio;
  } // espongo la label episodio
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get altSfondoScheda() {
    return this.labelsHelper.altSfondoScheda;
  } // espongo l'alt dello sfondo
  // Getter che mi restituisce questo valore in modo comodo nel template.
  get altTitoloScheda() {
    return this.labelsHelper.altTitoloScheda;
  } // espongo l'alt del titolo

  private readonly ctx: SchedaStateContext; //il contesto condiviso tra helper e componente
  private readonly audioHelper: SchedaAudioHelper; //l'helper audio della scheda
  private readonly trailerHelper: SchedaTrailerHelper; //l'helper del trailer scheda
  private readonly stagioniHelper: SchedaStagioniHelper; //l'helper stagioni
  private readonly labelsHelper: SchedaLabelsHelper; //l'helper delle label UI
  private readonly correlateHelper: SchedaCorrelateHelper; //l'helper delle correlate
  private readonly subs = new Subscription(); // raccolgo le subscription da pulire in destroy

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private api: ApiService,
    private authService: Authservice,
    private translate: TranslateService,
    private schedaCache: SchedaCacheService,
    private cambioLingua: CambioLinguaService,
    private schedaPronta: SchedaProntaService,
    private audioGlobaleService: AudioGlobaleService,
    private stopVideoGlobale: StopVideoGlobaleService,
    private transizioneTitolo: SchedaPlayerTransizioneTitoloService,
    private titoloPagina: TitoloPaginaService,
    private cdr: ChangeDetectorRef,
    private statoPagamento: StatoPagamentoService,
    private toastService: ToastService,
  ) {
    this.ctx = new SchedaStateContext(); // creo il contesto condiviso della scheda

    this.audioHelper = new SchedaAudioHelper(
      this.ctx,
      audioGlobaleService,
      () => this.trailerHelper.resettaPerNuovoAvvio(),
      () => {},
    ); // inizializzo l'helper audio

    this.trailerHelper = new SchedaTrailerHelper(
      this.ctx,
      this.audioHelper,
      audioGlobaleService,
      () => this.cambioLingua.leggiCodiceLingua(),
      () => this.labelsHelper.aggiornaTrailerTitle(),
    ); // inizializzo l'helper trailer

    this.stagioniHelper = new SchedaStagioniHelper(
      this.ctx,
      api,
      cambioLingua,
      location,
    ); // inizializzo l'helper stagioni

    this.labelsHelper = new SchedaLabelsHelper(
      translate,
      titoloPagina,
      cambioLingua,
      () => this.titoloScheda,
      () => this.ctx.trailerInRiproduzione,
      () => this.ctx.distrutto,
    ); // inizializzo l'helper delle label

    this.correlateHelper = new SchedaCorrelateHelper(
      api,
      cambioLingua,
      () => this.ctx.idContenuto,
      () => this.ctx.tipoContenuto,
    ); // inizializzo l'helper delle correlate
  }

  private _playerSchedaRef: ElementRef | null = null; // tengo il riferimento al player trailer della scheda

  @ViewChild('playerSchedaRef')
  set playerSchedaRef(ref: ElementRef | undefined) {
    this._playerSchedaRef = ref ?? null; // salvo il riferimento attuale del player scheda
    if (ref) this.trailerHelper.inizializzaDaRef(ref); // inizializzo il player quando il ref diventa disponibile
  }

  /**
   * Gestisce il post-render della view.
   *
   * @returns void
   */
  ngAfterViewInit(): void {}

  /**
   * Gestisce il popstate del browser chiudendo il player principale se aperto.
   *
   * @returns void
   */
  @HostListener('window:popstate')
  gestisciPopState(): void {
    if (this.mostraPlayerVideo) {
      this.mostraPlayerVideo = false; // chiudo il player principale
      this.transitioneVersoPLayer = false; // chiudo lo stato di transizione verso il player
      this.schedaPronta.impostaPlayerAperto(false); // notifico che il player non e' piu' aperto
      this.transizioneTitolo.ripristinaTitoloOrigineScheda(); // ripristino il titolo della scheda
    }
  }

  /**
   * Gestisce la perdita di focus fermando il trailer della scheda con fade audio.
   *
   * @returns void
   */
  @HostListener('window:blur')
  gestisciBlurFinestra(): void {
    if (!this.ctx.playerScheda || !this.ctx.mostraVideoScheda) return; // esco se non ho un trailer visibile da fermare
    this.ctx.avvioTrailerSchedaRichiesto = false; // annullo eventuali richieste di avvio trailer
    if (this.ctx.timerMostraVideoScheda) {
      clearTimeout(this.ctx.timerMostraVideoScheda); // annullo il timer che dovrebbe mostrare il video
      this.ctx.timerMostraVideoScheda = null; // pulisco il timer di mostra video
    }
    this.ctx.mostraVideoScheda = false; // nascondo il video della scheda
    this.audioHelper
      .sfumaGuadagnoVerso(0, this.ctx.durataFadeSchedaMs)
      .finally(() => {
        try {
          this.ctx.playerScheda?.pause?.();
        } catch {} // provo a mettere in pausa il player
        try {
          this.ctx.playerScheda?.currentTime?.(0);
        } catch {} // provo a riportare il trailer all'inizio
      });
  }

  /**
   * Gestisce il ritorno del focus riprogrammando l'avvio del trailer se necessario.
   *
   * @returns void
   */
  @HostListener('window:focus')
  gestisciFocusFinestra(): void {
    if (!this.ctx.trailerInRiproduzione) return; // esco se il trailer non dovrebbe essere attivo
    if (!this.ctx.playerScheda) return; // esco se il player trailer non esiste
    if (this.ctx.mostraPlayerSchedaNelDom && this.ctx.playerSchedaPronto)
      this.trailerHelper.richiediAvvio(true); // richiedo un nuovo avvio immediato del trailer
  }

  /**
   * Attiva o disattiva il trailer della scheda.
   *
   * @returns void
   */
  toggleTrailer(): void {
    if (this.ctx.trailerInRiproduzione) {
      this.ctx.trailerInRiproduzione = false; // segno che il trailer non deve piu' riprodursi
      if (this.ctx.timerInserisciPlayerSchedaNelDom) {
        clearTimeout(this.ctx.timerInserisciPlayerSchedaNelDom); // annullo l'eventuale inserimento player nel DOM
        this.ctx.timerInserisciPlayerSchedaNelDom = null; // pulisco il timer di inserimento
      }
      if (this.ctx.timerMostraVideoScheda) {
        clearTimeout(this.ctx.timerMostraVideoScheda); // annullo l'eventuale timer che mostra il video
        this.ctx.timerMostraVideoScheda = null; // pulisco il timer di mostra video
      }
      this.ctx.avvioTrailerSchedaRichiesto = false; // annullo la richiesta di avvio trailer
      if (this.ctx.mostraVideoScheda) {
        this.ctx.mostraVideoScheda = false; // nascondo il video della scheda
        this.audioHelper
          .sfumaGuadagnoVerso(0, this.ctx.durataFadeSchedaMs)
          .finally(() => this.trailerHelper.resettaPerNuovoAvvio()); // faccio fade audio e poi resetto il player
      }
      this.labelsHelper.aggiornaTrailerTitle(); // aggiorno il title del trailer
    } else {
      this.ctx.trailerInRiproduzione = true; // segno che il trailer deve tornare attivo
      if (this.ctx.mostraPlayerSchedaNelDom && this.ctx.playerSchedaPronto) {
        this.trailerHelper.richiediAvvio(true); // se il player e' pronto richiedo un avvio immediato
        this.labelsHelper.aggiornaTrailerTitle(); // aggiorno il title del trailer
      } else {
        this.trailerHelper.programmaInserimento(); // altrimenti pianifico l'inserimento del player
      }
    }
  }

  /**
   * Avvia la transizione verso il player principale.
   *
   * @returns void
   */
onRiproduci(): void {
    if (this.pagamentoFallito) return;
    this.avviaTransizionePlayer();
  }

  onClicEpisodio(n: number): void {
    if (this.pagamentoFallito) return;
    this.avviaTransizionePlayer(n);
  }

  /**
   * Seleziona una stagione della serie.
   *
   * @param n Numero stagione da selezionare.
   * @returns Promise<void> Promise risolta al termine della selezione.
   */
   async selezionaStagione(n: string): Promise<void> {
    await this.stagioniHelper.selezionaStagione(n); // delego all'helper il cambio stagione
  }

  get puoRiordinareEpisodi(): boolean {
    const ruolo = this.authService.leggiObsAuth().value?.idRuolo;
    return ruolo === 4 || ruolo === 7;
  }

  onRiordinaEpisodi(): void {
    if (!this.puoRiordinareEpisodi) return;
    if (this.ctx.tipoContenuto !== 'serie' || !this.ctx.idContenuto) return;
    window.dispatchEvent(
      new CustomEvent('apri-riordina-episodi', { detail: { id: this.ctx.idContenuto } }),
    );
  }

  onAggiungiStagione(): void {
  if (!this.puoRiordinareEpisodi) return;
  if (this.ctx.tipoContenuto !== 'serie' || !this.ctx.idContenuto) return;
  const numeroStagione =
    this.ctx.stagioni.reduce((max, s) => Math.max(max, Number(s.numero_stagione)), 0) + 1;
  window.dispatchEvent(
    new CustomEvent('apri-form-nuova-stagione', {
      detail: { idSerie: this.ctx.idContenuto, numeroStagione },
    }),
  );
}

onAggiungiEpisodio(): void {
  if (!this.puoRiordinareEpisodi) return;
  if (this.ctx.tipoContenuto !== 'serie' || !this.ctx.idContenuto) return;
  if (!this.ctx.stagioneSelezionata) return;

  const stagioneCorrente = this.ctx.stagioni.find(
    (s) => String(s.numero_stagione) === String(this.ctx.stagioneSelezionata),
  );

  if (!stagioneCorrente) return;

  window.dispatchEvent(
    new CustomEvent('apri-form-nuovo-episodio', {
      detail: {
        idSerie: this.ctx.idContenuto,
        idStagione: stagioneCorrente.id_stagione,
        numeroStagione: Number(stagioneCorrente.numero_stagione),
        numeroEpisodio: Number(stagioneCorrente.numero_episodi) + 1,
      },
    }),
  );
}

onEliminaStagione(): void {
  if (!this.puoRiordinareEpisodi) return;
  if (!this.utentePuoEliminareMedia()) {
    this.toastService.errore("ERRORE: non hai l'abilità per eliminare media.");
    return;
  }
  if (this.ctx.tipoContenuto !== 'serie' || !this.ctx.idContenuto) return;
  if (!this.ctx.stagioneSelezionata) return;

  const stagioneCorrente = this.ctx.stagioni.find(
    (s) => String(s.numero_stagione) === String(this.ctx.stagioneSelezionata),
  );

  if (!stagioneCorrente?.id_stagione) return;

  this.categorieFileEliminazioneStagione = {
    anteprime_episodi: true,
    cartella_hls: true,
  };

  this.stagioneDaEliminare = {
    idSerie: this.ctx.idContenuto,
    idStagione: Number(stagioneCorrente.id_stagione),
    numeroStagione: Number(stagioneCorrente.numero_stagione),
  };

  this.mostraModaleEliminaStagione = true;
}

chiudiModaleEliminaStagione(): void {
  if (this.eliminazioneStagioneInCorso) return;
  this.mostraModaleEliminaStagione = false;
}

confermaEliminaStagione(): void {
  if (this.eliminazioneStagioneInCorso || !this.stagioneDaEliminare) return;
  if (!this.utentePuoEliminareMedia()) {
    this.toastService.errore("ERRORE: non hai l'abilità per eliminare media.");
    return;
  }

  this.eliminazioneStagioneInCorso = true;

  this.api.eliminaStagioneSerie(
    this.stagioneDaEliminare.idSerie,
    this.stagioneDaEliminare.idStagione,
    this.categorieFileEliminazioneStagione,
  ).pipe(take(1)).subscribe({
    next: () => {
      this.mostraModaleEliminaStagione = false;
      this.eliminazioneStagioneInCorso = false;
      this.schedaCache.svuota();
      this.toastService.successo('Stagione eliminata con SUCCESSO.');
      setTimeout(() => {
        const pathSchedaSerie = window.location.pathname.replace(/\/(stagione|season)\/\d+$/, '');
        window.location.href = pathSchedaSerie;
      }, 500);
    },
    error: () => {
      this.mostraModaleEliminaStagione = false;
      this.eliminazioneStagioneInCorso = false;
      this.toastService.errore("Errore durante l'eliminazione della stagione.");
    },
  });
}

utentePuoEliminareMedia(): boolean {
  return !!this.authService.leggiObsAuth().value?.abilita?.includes(6);
}

utentePuoModificareMedia(): boolean {
  return !!this.authService.leggiObsAuth().value?.abilita?.includes(5);
}

  tracciaRigaCorrelata = (_i: number, riga: { idCategoria: string }): string =>
    this.correlateHelper.tracciaRigaCorrelata(_i, riga); // delego la chiave trackBy delle correlate

  /**
   * Restituisce le chiavi di un oggetto.
   *
   * @param obj Oggetto di cui leggere le chiavi.
   * @returns string[] Lista delle chiavi.
   */
  getChiavi(obj: Record<string, any>): string[] {
    return Object.keys(obj);
  } // restituisco le chiavi dell'oggetto

  /**
   * Converte un valore in stringa.
   *
   * @param val Valore da convertire.
   * @returns string Valore convertito in stringa.
   */
  toString(val: any): string {
    return String(val);
  } // converto il valore in stringa

  /**
   * Inizializza la scheda, collega le subscription e prepara il caricamento dati.
   *
   * @returns void
   */
  ngOnInit(): void {
    if (this.schedaPronta.loaderGlobalmenteNascosto) {
      this._loaderNascosto = true; // segno subito il loader come gia' nascosto
    } else {
      window.addEventListener('loader-hidden', this.onLoaderHidden, {
        once: true,
      }); // ascolto l'evento di fine loader globale
    }

    this.subs.add(
      this.audioGlobaleService.statoAudio$.subscribe((consentito) => {
        this.ctx.audioBloccatoDaUtente = !consentito; // allineo il blocco audio locale allo stato globale
        if (this.ctx.audioBloccatoDaUtente) {
          this.ctx.soloBrowserBlocca = false; // chiudo il fallback browser se l'utente blocca davvero l'audio
          try {
            this.audioGlobaleService.setSoloBrowserBlocca(false);
          } catch {} // notifico la chiusura del fallback browser
          this.audioHelper.rimuoviSbloccoAudioScheda(); // rimuovo il listener di sblocco audio
          try {
            this.audioHelper.inizializzaWebAudio();
          } catch {} // provo a inizializzare il grafo WebAudio
          this.audioHelper
            .sfumaGuadagnoVerso(0, this.ctx.durataFadeSchedaMs)
            .finally(() => {
              try {
                this.ctx.playerScheda?.muted?.(true);
              } catch {}
            }); // porto l'audio a zero e poi metto in muto il player
          return;
        }
        try {
          this.audioHelper.inizializzaWebAudio();
        } catch {} // provo a inizializzare il grafo WebAudio
        try {
          if (this.ctx.contestoAudio?.state === 'suspended')
            this.ctx.contestoAudio.resume().catch(() => {}); // provo a riattivare il contesto audio se sospeso
        } catch {}
        try {
          this.audioHelper.sfumaGuadagnoVerso(1, 80);
        } catch {} // faccio rientrare velocemente l'audio
        try {
          this.ctx.playerScheda?.muted?.(false);
        } catch {} // tolgo il mute reale dal player
        if (this.ctx.mostraVideoScheda)
          this.trailerHelper.proseguiAvvio(); // se il video e' visibile proseguo con l'avvio
        else this.trailerHelper.sincronizzaAvvio(); // altrimenti risincronizzo la sorgente trailer
      }),
    );

    const navState =
      this.router.getCurrentNavigation()?.extras?.state ?? history.state; // leggo lo state router iniziale
    const urlDaState = String(navState?.['urlSfondo'] || '').trim(); // leggo lo sfondo passato via state
    const imgTitoloDaState = String(navState?.['urlImgTitolo'] || '').trim(); // leggo l'immagine titolo passata via state
    const descDaState = String(navState?.['descrizioneTestuale'] || '').trim(); // leggo la descrizione passata via state
    const tabellaDaState = navState?.['tabellaDati'] ?? null; // leggo la tabella dati passata via state
    if (urlDaState) {
      this.urlSfondoScheda = urlDaState;
      this._sfondoPronto = true;
    } // applico subito lo sfondo ricevuto
    if (imgTitoloDaState) {
      this.imgTitoloScheda = imgTitoloDaState;
      this._titoloPronto = true;
    } // applico subito il titolo grafico ricevuto
    if (descDaState) {
      this.descrizioneTestuale = descDaState;
      this._descPronta = true;
    } // applico subito la descrizione ricevuta
    if (tabellaDaState) this.applicaTabellaDaState(tabellaDaState); // applico subito i dati tabellari ricevuti

    this.setupCambioLinguaSubscriptions(); // collego le subscription del cambio lingua
    this.setupParamMapSubscription();

    this.subs.add(
      this.statoPagamento.fallito$.subscribe(v => this.pagamentoFallito = v)
    );

    this.subs.add(
      this.stopVideoGlobale
        .osservaRichiesteFadeAudio$()
        .subscribe(({ durataMs, done }) => {
          if (!this.ctx.playerScheda || !this.ctx.mostraVideoScheda) {
            done();
            return;
          } // se non ho player visibile confermo subito
          this.audioHelper
            .sfumaGuadagnoVerso(0, durataMs)
            .finally(() => done()); // eseguo il fade audio richiesto e poi confermo
        }),
    );
    this.subs.add(
      this.stopVideoGlobale
        .osservaRichiesteChiusuraPlayerScheda$()
        .subscribe(({ durataMs, done }) => {
          this.trailerHelper
            .chiudiConFadeEReset(durataMs)
            .finally(() => done()); // chiudo il player trailer e poi confermo
        }),
    );
    this.subs.add(
      this.schedaPronta.chiudiPlayer$.subscribe(() => {
        this.mostraPlayerVideo = false; // chiudo il player principale
        this.transitioneVersoPLayer = false; // chiudo la transizione verso il player
        this.schedaPronta.impostaPlayerAperto(false); // notifico che il player non e' aperto
        this.schedaPronta.impostaHeaderNascosto(false); // ripristino l'header visibile
        this.transizioneTitolo.ripristinaTitoloOrigineScheda(); // ripristino il titolo originale
        const pathPulito = this.location.path(true).split('?')[0]; // ricavo il path senza query string
        this.location.replaceState(pathPulito); // ripulisco l'URL
        this.startAnim = false;
        this.startAnimTitolo = false;
        this.startAnimDescrizione = false; // spengo le animazioni prima del restart
        requestAnimationFrame(() => {
          this.startAnim = true;
          this.startAnimTitolo = true;
          this.startAnimDescrizione = true; // riaccendo le animazioni al frame successivo
        });
      }),
    );
  }

  /**
   * Ripulisce lo stato della scheda, salva la cache e chiude tutte le risorse attive.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    this.schedaPronta.pulisciInfoMedia();
    this.ctx.distrutto = true; // segno il contesto come distrutto
    if (this.ctx.tipoContenuto && this.ctx.idContenuto) {
      const lingua = this.cambioLingua.leggiCodiceLingua(); // leggo la lingua corrente della cache
      this.schedaCache.set(
        this.ctx.tipoContenuto,
        this.ctx.idContenuto,
        lingua,
        {
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
        },
      ); // salvo lo snapshot corrente della scheda in cache
    }
    this.subs.unsubscribe(); // chiudo tutte le subscription attive
    window.removeEventListener('loader-hidden', this.onLoaderHidden); // rimuovo l'ascolto del loader globale
    this.trailerHelper.clearAllTimers(); // pulisco i timer del trailer helper
    this.labelsHelper.clearRetryTimer(); // pulisco gli eventuali retry delle label
    this.audioHelper.rimuoviSbloccoAudioScheda(); // rimuovo il listener di sblocco audio
    try {
      this.audioGlobaleService.setSoloBrowserBlocca(false);
    } catch {} // ripristino il flag browser blocca a false
    const p = this.ctx.playerScheda; // mi salvo il player corrente prima della chiusura
    this.audioHelper
      .sfumaGuadagnoVerso(0, this.ctx.durataFadeSchedaMs)
      .finally(() => {
        try {
          if (p) p.dispose();
        } catch {}
      }); // faccio fade audio e poi provo a distruggere il player
  }

  /**
   * Collega le subscription necessarie per il cambio lingua.
   *
   * @returns void
   */
  private setupCambioLinguaSubscriptions(): void {
    this.subs.add(
      this.cambioLingua.cambioLinguaAvviato$.subscribe((codice: string) => {
        if (this.ctx.tipoContenuto === 'serie')
          this.stagioniHelper.caricamentoStagioneInCorso = true; // segno il caricamento stagione come attivo durante il cambio lingua

        if (this.ctx.slugCorrente) {
          const url = imgTitoloDaSlug(this.ctx.slugCorrente, codice); // costruisco l'URL del nuovo titolo grafico
          this._nuovoTitoloPrecaricato = url; // salvo l'URL titolo da usare dopo il cambio lingua
          this._preloadTitoloPromise = new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => resolve();
            img.src = url; // precarico il nuovo titolo grafico
          });
        } else {
          this._nuovoTitoloPrecaricato = ''; // pulisco il titolo precaricato se non ho slug
          this._preloadTitoloPromise = Promise.resolve(); // considero subito completato il preload titolo
        }

        if (this.ctx.idContenuto && this.ctx.tipoContenuto) {
          const fetch$ =
            this.ctx.tipoContenuto === 'film'
              ? this.api.getFilmTraduzioni(this.ctx.idContenuto, codice)
              : this.api.getSerieTraduzioni(this.ctx.idContenuto, codice); // preparo la chiamata traduzioni coerente col tipo

          let resolveDesc!: (v: string) => void;
          let resolveTitolo!: (v: string) => void; // preparo i resolver delle promise di prefetch
          this._prefetchDescPromise = new Promise<string>(
            (r) => (resolveDesc = r),
          ); // creo la promise della nuova descrizione
          this._prefetchTitoloPromise = new Promise<string>(
            (r) => (resolveTitolo = r),
          ); // creo la promise del nuovo titolo testuale

          fetch$.pipe(take(1)).subscribe({
            next: (res) => {
              resolveDesc(String(res?.data?.descrizione || '')); // risolvo la nuova descrizione tradotta
              resolveTitolo(String(res?.data?.titolo || '')); // risolvo il nuovo titolo tradotto
            },
            error: () => {
              resolveDesc(''); // in errore risolvo la descrizione vuota
              resolveTitolo(''); // in errore risolvo il titolo vuoto
            },
          });
        } else {
          this._prefetchDescPromise = Promise.resolve(''); // se manca il contenuto considero vuota la nuova descrizione
          this._prefetchTitoloPromise = Promise.resolve(''); // se manca il contenuto considero vuoto il nuovo titolo
        }
      }),
    );

    this.subs.add(
      this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
        const lingua = this.cambioLingua.leggiCodiceLingua(); // leggo la lingua appena applicata
        const nuovoTitolo = this.ctx.slugCorrente
          ? imgTitoloDaSlug(this.ctx.slugCorrente, lingua)
          : this.imgTitoloScheda; // ricavo l'URL titolo coerente con la nuova lingua

        const trailerEraAttivo =
          this.ctx.trailerInRiproduzione &&
          (this.ctx.mostraVideoScheda ||
            this.ctx.mostraPlayerSchedaNelDom ||
            !!this.ctx.timerMostraVideoScheda); // verifico se il trailer era da considerare ancora attivo

        const continuaDopoFade = () => {
          if (!this.ctx.idContenuto || !this.ctx.tipoContenuto) {
            this.startAnimTitolo = false; // spengo l'animazione titolo
            this.imgTitoloScheda = nuovoTitolo; // applico subito il nuovo titolo grafico
            requestAnimationFrame(() =>
              requestAnimationFrame(() => (this.startAnimTitolo = true)),
            ); // riavvio l'animazione del titolo
            return;
          }

          const descP = this._prefetchDescPromise ?? Promise.resolve(''); // recupero la promise descrizione prefetched
          const titoloP = this._prefetchTitoloPromise ?? Promise.resolve(''); // recupero la promise titolo prefetched
          this._prefetchDescPromise = null;
          this._prefetchTitoloPromise = null; // pulisco i riferimenti di prefetch

          Promise.all([descP, titoloP]).then(
            ([nuovaDesc, nuovoTitoloScheda]) => {
              this.titoloScheda = nuovoTitoloScheda; // applico il nuovo titolo testuale
              this.labelsHelper.aggiornaAltSfondo(); // riallineo alt e title della scheda
              this.emettiInfoMedia();

              const preP = this._preloadTitoloPromise ?? Promise.resolve(); // recupero la promise di preload del titolo grafico
              const urlTit = this._nuovoTitoloPrecaricato || nuovoTitolo; // ricavo l'URL finale del titolo grafico
              this._preloadTitoloPromise = null;
              this._nuovoTitoloPrecaricato = ''; // pulisco i riferimenti del preload titolo

              preP.then(() => {
                this.startAnimTitolo = false;
                this.startAnimDescrizione = false; // spengo le animazioni di titolo e descrizione
                this.descrizioneTestuale = nuovaDesc; // applico la nuova descrizione tradotta
                const img2 = new Image(); // creo un preload finale del titolo grafico da mostrare
                img2.onload = img2.onerror = () => {
                  this.imgTitoloScheda = urlTit; // applico il nuovo titolo grafico una volta pronto
                  requestAnimationFrame(() =>
                    requestAnimationFrame(() => {
                      this.segnale_cambio = true; // segnalo che il cambio e' avvenuto
                      this.labelsHelper.commitLabelUISincronizzate(); // riallineo le label UI alla nuova lingua
                      this.schedaPronta.impostaLabelTorna(
                        lingua === 'it'
                          ? 'Ritorna al catalogo ⮨'
                          : 'Back to catalog ⮨',
                      ); // aggiorno la label torna catalogo
                      this.startAnimTitolo = true;
                      this.startAnimDescrizione = true; // riavvio le animazioni di titolo e descrizione
                    }),
                  );
                };
                img2.src = urlTit; // faccio partire il preload finale del titolo grafico
              });

              this.correlateHelper.caricaRigheCorrelate(false); // ricarico le correlate senza mostrare loading
              if (
                this.ctx.tipoContenuto === 'serie' &&
                this.ctx.stagioneSelezionata
              ) {
                this.ctx.stagioneCachata.clear();
                this.ctx.serieData = {}; // pulisco cache e dati stagioni prima del nuovo caricamento
                this.stagioniHelper.selezionaStagione(
                  this.ctx.stagioneSelezionata,
                ); // ricarico la stagione selezionata nella nuova lingua
              }
              if (trailerEraAttivo && this.ctx.slugCorrente)
                this.trailerHelper.programmaInserimento(); // se il trailer era attivo riprogrammo l'inserimento del player
            },
          );
        };

        if (trailerEraAttivo)
          this.trailerHelper
            .chiudiConFadeEReset(350)
            .finally(() => continuaDopoFade()); // chiudo prima il trailer e poi continuo il cambio lingua
        else continuaDopoFade(); // se il trailer non era attivo continuo subito il cambio lingua
      }),
    );
  }

  /**
   * Collega la subscription ai parametri di route e gestisce il caricamento del contenuto.
   *
   * @returns void
   */
  private setupParamMapSubscription(): void {
    this.route.paramMap.subscribe((pm) => {
      const idRaw = pm.get('id'); // leggo l'id grezzo dai parametri route
      const id = idRaw ? Number(idRaw) : NaN; // provo a convertire l'id in numero
      if (!idRaw || Number.isNaN(id)) return; // esco se l'id non e' valido

      const ns = history.state; // leggo lo state della navigazione corrente
      const urlS = String(ns?.['urlSfondo'] || '').trim(); // leggo il nuovo sfondo dallo state
      const imgS = String(ns?.['urlImgTitolo'] || '').trim(); // leggo il nuovo titolo grafico dallo state
      const descS = String(ns?.['descrizioneTestuale'] || '').trim(); // leggo la nuova descrizione dallo state
      const tabS = ns?.['tabellaDati'] ?? null; // leggo i nuovi dati tabellari dallo state

      this.schedaPronta.reset(); // segno la scheda come non pronta
      this.resetStatoScheda(); // resetto lo stato interno prima del nuovo contenuto

      this.cdr.detectChanges(); // rimuovo l'img sfondo dal DOM (urlSfondoScheda è ora '' quindi ngIf=false)

      if (this._primaNavigazione) {
        const sp = new URLSearchParams(window.location.search); // leggo gli eventuali parametri di riproduzione dall'URL
        this._paramRiproduzioneInAttesa =
          sp.get('riproduzione') || sp.get('play') || null; // salvo l'eventuale parametro play
        if (this._paramRiproduzioneInAttesa)
          this._stagioneRiproduzioneInAttesa = pm.get('stagione') || null; // salvo l'eventuale stagione associata alla riproduzione
      }
      this._primaNavigazione = false; // segno che la prima navigazione e' stata gestita

      if (urlS) {
        this.urlSfondoScheda = urlS;
        this._sfondoPronto = true;
      } // applico subito il nuovo sfondo se presente
      if (imgS) {
        this.imgTitoloScheda = imgS;
        this._titoloPronto = true;
      } // applico subito il nuovo titolo grafico se presente
      if (descS) {
        this.descrizioneTestuale = descS;
        this._descPronta = true;
      } // applico subito la nuova descrizione se presente
      if (tabS) this.applicaTabellaDaState(tabS); // applico subito i nuovi dati tabellari se presenti

      this.ctx.idContenuto = id; // salvo l'id contenuto corrente nel contesto
      this.ctx.tipoContenuto = this.leggiTipoDaUrl(); // ricavo e salvo il tipo contenuto dall'URL

      this.cdr.detectChanges(); // creo l'img sfondo come elemento fresco nel DOM (ngIf torna true se urlSfondoScheda è presente)
      const sfondoEl = document.querySelector(
        '.sfondo_scheda',
      ) as HTMLElement | null; // recupero l'elemento sfondo della scheda
      if (sfondoEl) void sfondoEl.offsetWidth; // forzo il reflow sull'elemento appena creato
      this.startAnim = true; // riattivo l'animazione generale

      this.verificaEAvviaAnimazioni(); // provo ad avviare le animazioni se tutto e' pronto

      const lingua = this.cambioLingua.leggiCodiceLingua(); // leggo la lingua corrente per la cache
      const cached = this.ctx.tipoContenuto
        ? this.schedaCache.get(this.ctx.tipoContenuto, id, lingua)
        : null; // provo a recuperare uno snapshot dalla cache
      if (cached) {
        this.ripristinaDaCache(cached); // se esiste la cache ripristino tutto da li'
        return;
      }

      if (this.ctx.tipoContenuto === 'film') this.caricaFilm(id); // avvio il caricamento film
      if (this.ctx.tipoContenuto === 'serie') this.caricaSerie(id, pm); // avvio il caricamento serie
    });
  }

  /**
   * Avvia la transizione verso il player film o serie.
   *
   * @param episodio Numero episodio opzionale per le serie.
   * @returns void
   */
  private avviaTransizionePlayer(episodio?: number): void {
    if (this.pagamentoFallito) return;
    if (!this.ctx.slugCorrente) return;

    if (this.ctx.tipoContenuto === 'serie' && episodio != null) {
      const stagione = this.ctx.stagioneSelezionata ?? '1';
      const chiavePronta = this.chiaveEpisodioDaNumero(stagione, episodio);

      if (chiavePronta) {
        this.eseguiTransizionePlayer(episodio, chiavePronta);
        this.verificaPagamentoEChiudiSeFallito();
        return;
      }

      const st = this.ctx.stagioni.find(
        (s) => String(s.numero_stagione) === stagione,
      );
      if (!st) return;

      this.stagioniHelper
        .caricaEpisodiStagione(st.id_stagione, stagione)
        .then(() => {
          const chiave = this.chiaveEpisodioDaNumero(stagione, episodio);
          if (!chiave) return;
          this.eseguiTransizionePlayer(episodio, chiave);
          this.verificaPagamentoEChiudiSeFallito();
        });
      return;
    }

    this.eseguiTransizionePlayer(episodio);
    this.verificaPagamentoEChiudiSeFallito();
  }

  private chiaveEpisodioDaNumero(stagione: string, episodio: number): string | null {
    const episodiStagione = this.ctx.serieData[stagione];
    if (!episodiStagione) return null;
    const chiavi = Object.keys(episodiStagione);
    const chiaveOggetto = chiavi[episodio - 1];
    if (!chiaveOggetto) return null;
    return episodiStagione[chiaveOggetto].chiaveArchivio || null;
  }

  private verificaPagamentoEChiudiSeFallito(): void {
    this.api.verificaPagamento().pipe(take(1)).subscribe({
      next: (ris) => {
        if (!ris.data?.pagamento_ok) {
          this.statoPagamento.aggiorna(true);
          this.mostraPlayerVideo = false;
          this.transitioneVersoPLayer = false;
          this.schedaPronta.impostaPlayerAperto(false);
          this.schedaPronta.impostaHeaderNascosto(false);
          this.transizioneTitolo.ripristinaTitoloOrigineScheda();
          const pathPulito = this.location.path(true).split('?')[0];
          this.location.replaceState(pathPulito);
          this.translate.get('ui.toast.pagamento_bloccato').pipe(take(1)).subscribe(testo => {
            this.toastService.errorePersistente(testo);
          });
        }
      },
      error: () => {},
    });
  }

  private eseguiTransizionePlayer(episodio?: number, chiaveEpisodio?: string): void {
    const BASE = 'https://d2kd3i5q9rl184.cloudfront.net/streaming';
    const slug = this.ctx.slugCorrente; // mi salvo lo slug del contenuto

    if (this.ctx.tipoContenuto === 'film') {
      this.risorsePLayerVideo = {
        auto: `${BASE}/film/${slug}/master.m3u8`,
        '1080': `${BASE}/film/${slug}/1080/with-audio.m3u8`,
        '720': `${BASE}/film/${slug}/720/with-audio.m3u8`,
        '360': `${BASE}/film/${slug}/360/with-audio.m3u8`,
      }; // preparo le risorse HLS del film
      this.sottotitoliPlayerVideo = {
        en: `assets/sottotitoli/en/film/${slug}.vtt`,
        it: `assets/sottotitoli/it/film/${slug}.vtt`,
      }; // preparo i sottotitoli del film
    } else if (this.ctx.tipoContenuto === 'serie' && episodio != null && chiaveEpisodio) {
      const stagione = this.ctx.stagioneSelezionata ?? '1'; // ricavo la stagione da usare per lo stream episodio
      this.risorsePLayerVideo = {
        auto: `${BASE}/serie/${slug}/${chiaveEpisodio}/master.m3u8`,
        '1080': `${BASE}/serie/${slug}/${chiaveEpisodio}/1080/with-audio.m3u8`,
        '720': `${BASE}/serie/${slug}/${chiaveEpisodio}/720/with-audio.m3u8`,
        '360': `${BASE}/serie/${slug}/${chiaveEpisodio}/360/with-audio.m3u8`,
      }; // preparo le risorse HLS dell'episodio serie
      this.sottotitoliPlayerVideo = {
        en: `assets/sottotitoli/en/serie/${slug}.vtt`,
        it: `assets/sottotitoli/it/serie/${slug}.vtt`,
      }; // preparo i sottotitoli della serie
      this.infoEpisodioPlayer = { stagione: Number(stagione), episodio }; // salvo le info episodio correnti
    }

    if (this.ctx.trailerInRiproduzione) {
      this.ctx.avvioTrailerSchedaRichiesto = false; // annullo eventuali nuove richieste di avvio trailer
      this.ctx.trailerInRiproduzione = false; // segno che il trailer non e' piu' il contenuto attivo
      this.labelsHelper.aggiornaTrailerTitle(); // aggiorno il title del trailer
      if (this.ctx.mostraVideoScheda) {
        this.ctx.mostraVideoScheda = false; // nascondo il video trailer
        this.audioHelper
          .sfumaGuadagnoVerso(0, this.ctx.durataFadeSchedaMs)
          .finally(() => this.trailerHelper.smontaSubito()); // faccio fade audio e poi smonto il player trailer
      } else {
        this.trailerHelper.smontaSubito(); // se il trailer non e' visibile lo smonto subito
      }
    }

    const valore = episodio ? `ep${episodio}` : 'true'; // costruisco il valore del parametro play
    const lingua = this.cambioLingua.leggiCodiceLingua(); // leggo la lingua corrente
    const nomeP = lingua === 'it' ? 'riproduzione' : 'play'; // scelgo il nome parametro coerente con la lingua
    const pathC = this.location.path(true).split('?')[0]; // ricavo il path corrente senza query
    window.history.pushState(null, '', `${pathC}?${nomeP}=${valore}`); // aggiorno l'URL con il parametro di riproduzione
    this.schedaPronta.impostaUrlScheda(pathC); // notifico l'URL base della scheda
    this.schedaPronta.impostaPlayerAperto(true); // notifico che il player principale e' aperto
    this.schedaPronta.impostaHeaderNascosto(true); // notifico che l'header va nascosto
    this.mostraPlayerVideo = true; // mostro il player principale
    this.transitioneVersoPLayer = true; // attivo la transizione verso il player
    this.transizioneTitolo.animaTitoloVersocentro(); // animo il titolo verso il centro
  }

  /**
   * Carica i dati di una scheda film.
   *
   * @param id Id del film da caricare.
   * @returns void
   */
  private caricaFilm(id: number): void {
    this.api.getFilm(id).subscribe((res) => {
      this.descrizione = String(res?.data?.descrizione || ''); // salvo la descrizione semantica del film
      this.ctx.slugCorrente = slugDaDescrizione(this.descrizione); // ricavo lo slug del film
      this.anno = res?.data?.anno ?? null; // salvo l'anno del film
      this.durata = res?.data?.durata ?? null; // salvo la durata del film
      this.regista = String(res?.data?.regista || ''); // salvo il regista del film
      this.episodiTotali = null; // azzero gli episodi totali perche' non e' una serie
      if (!this.urlSfondoScheda) {
        this.urlSfondoScheda = sfondoDaDescrizione(this.descrizione);
      } // costruisco lo sfondo se manca
      if (!this.imgTitoloScheda) {
        this.imgTitoloScheda = imgTitoloDaSlug(
          this.ctx.slugCorrente,
          this.cambioLingua.leggiCodiceLingua(),
        );
      } // costruisco il titolo grafico se manca
      this._sfondoPronto = this._titoloPronto = this._tabellaPronta = true; // segno pronti sfondo, titolo e tabella
      this.verificaEAvviaAnimazioni(); // provo ad avviare le animazioni
      this.correlateHelper.caricaRigheCorrelate(); // carico le righe correlate
      if (this.ctx.slugCorrente && !this._paramRiproduzioneInAttesa)
        this.trailerHelper.programmaInserimento(); // se posso, programmo il trailer della scheda
    });

    this.api
      .getFilmTraduzioni(id, this.cambioLingua.leggiCodiceLingua())
      .subscribe((res) => {
        this.descrizioneTestuale = String(res?.data?.descrizione || ''); // salvo la descrizione tradotta del film
        this.titoloScheda = String(res?.data?.titolo || ''); // salvo il titolo tradotto del film
        this.labelsHelper.aggiornaAltSfondo(); // aggiorno alt e title della scheda
        this._descPronta = true; // segno pronta la descrizione
        this.verificaEAvviaAnimazioni(); // provo ad avviare le animazioni
      });
  }

  /**
   * Carica i dati di una scheda serie.
   *
   * @param id Id della serie da caricare.
   * @param pm ParamMap corrente della route.
   * @returns void
   */
  private caricaSerie(id: number, pm: any): void {
    const lingua = this.cambioLingua.leggiCodiceLingua(); // leggo la lingua corrente
    const stagioneDaUrl = pm.get('stagione') ? Number(pm.get('stagione')) : 1; // leggo la stagione richiesta dall'URL

    this.api.getSerieTraduzioni(id, lingua).subscribe((res) => {
      this.descrizioneTestuale = String(res?.data?.descrizione || ''); // salvo la descrizione tradotta della serie
      this.titoloScheda = String(res?.data?.titolo || ''); // salvo il titolo tradotto della serie
      this.labelsHelper.aggiornaAltSfondo(); // aggiorno alt e title della scheda
      this._descPronta = true; // segno pronta la descrizione
      this.verificaEAvviaAnimazioni(); // provo ad avviare le animazioni
    });

    forkJoin([this.api.getSerie(id), this.api.getStagioni(id)]).subscribe(
      ([resSerie, resStagioni]: [any, any]) => {
        this.descrizione = String(resSerie?.data?.descrizione || ''); // salvo la descrizione semantica della serie
        this.ctx.slugCorrente = slugDaDescrizione(this.descrizione); // ricavo lo slug della serie
        this.anno = resSerie?.data?.anno ?? null; // salvo l'anno della serie
        this.episodiTotali = resSerie?.data?.numero_episodi ?? null; // salvo il totale episodi della serie
        this.regista = String(resSerie?.data?.regista || ''); // salvo il regista della serie
        this.durata = null; // azzero la durata perche' qui gestisco una serie
        if (!this.urlSfondoScheda) {
          this.urlSfondoScheda = sfondoDaDescrizione(this.descrizione);
        } // costruisco lo sfondo se manca
        if (!this.imgTitoloScheda) {
          this.imgTitoloScheda = imgTitoloDaSlug(this.ctx.slugCorrente, lingua);
        } // costruisco il titolo grafico se manca
        this._sfondoPronto = this._titoloPronto = this._tabellaPronta = true; // segno pronti sfondo, titolo e tabella

        const lista: any[] = Array.isArray(resStagioni?.data)
          ? resStagioni.data
          : []; // normalizzo la lista stagioni ricevuta
        this.ctx.stagioni = lista.map((s) => ({
          id_stagione: s.id_stagione,
          numero_stagione: s.numero_stagione,
          numero_episodi: s.numero_episodi,
        })); // salvo le stagioni nel contesto

        if (this._paramRiproduzioneInAttesa?.startsWith('ep')) {
          const epR = Number(this._paramRiproduzioneInAttesa.replace('ep', '')); // ricavo il numero episodio richiesto
          const stagN = Number(this._stagioneRiproduzioneInAttesa ?? '1'); // ricavo la stagione richiesta per la riproduzione
          const si = this.ctx.stagioni.find((s) => s.numero_stagione === stagN); // cerco la stagione richiesta
          if (!si || epR < 1 || epR > si.numero_episodi) {
            const c = this.cambioLingua.leggiCodiceLingua(); // leggo la lingua per la route not found
            this.router.navigateByUrl(
              `/${c}/${c === 'it' ? 'non-trovato' : 'not-found'}`,
            );
            return; // se episodio o stagione non sono validi mando alla not found
          }
        }

        this.verificaEAvviaAnimazioni(); // provo ad avviare le animazioni
        this.correlateHelper.caricaRigheCorrelate(); // carico le correlate della serie
        if (this.ctx.slugCorrente && !this._paramRiproduzioneInAttesa)
          this.trailerHelper.programmaInserimento(); // se posso programmo il trailer della scheda

        if (this.ctx.stagioni.length > 0) {
          const explicit = !!pm.get('stagione'); // verifico se la stagione era esplicitamente in URL
          const target = this.ctx.stagioni.find(
            (s) => s.numero_stagione === stagioneDaUrl,
          ); // cerco la stagione richiesta
          if (!target && explicit) {
            const c = this.cambioLingua.leggiCodiceLingua(); // leggo la lingua per la route not found
            this.router.navigateByUrl(
              `/${c}/${c === 'it' ? 'non-trovato' : 'not-found'}`,
            );
            return; // se la stagione esplicita non esiste mando alla not found
          }
          const stagione = target ?? this.ctx.stagioni[0]; // uso la stagione richiesta oppure la prima disponibile
          const targetStr = String(stagione.numero_stagione); // converto il numero stagione in stringa
          this.stagioniHelper.aggiornaUrlStagione(targetStr); // aggiorno l'URL con la stagione effettiva
          this.stagioniHelper
            .caricaEpisodiStagione(stagione.id_stagione, targetStr)
            .then(() => {
              this.ctx.stagioneSelezionata = targetStr;
            }); // carico gli episodi e poi salvo la stagione selezionata
        }
      },
    );
  }

  /**
   * Ripristina lo stato della scheda a partire da uno snapshot in cache.
   *
   * @param cached Snapshot cache da ripristinare.
   * @returns void
   */
  private ripristinaDaCache(cached: any): void {
    this.descrizione = cached.descrizione; // ripristino la descrizione semantica
    this.descrizioneTestuale = cached.descrizioneTestuale; // ripristino la descrizione testuale
    this.urlSfondoScheda = cached.urlSfondoScheda; // ripristino lo sfondo della scheda
    this.imgTitoloScheda = cached.imgTitoloScheda; // ripristino l'immagine titolo della scheda
    this.anno = cached.anno; // ripristino l'anno del contenuto
    this.durata = cached.durata; // ripristino la durata del contenuto
    this.episodiTotali = cached.episodiTotali; // ripristino il totale episodi
    this.regista = cached.regista; // ripristino il regista
    this.titoloScheda = cached.titoloScheda ?? ''; // ripristino il titolo scheda
    this.ctx.slugCorrente = cached.slugCorrente; // ripristino lo slug corrente
    this.ctx.stagioni = cached.stagioni; // ripristino la lista stagioni
    this.ctx.stagioneSelezionata = cached.stagioneSelezionata; // ripristino la stagione selezionata
    this.ctx.serieData = cached.serieData; // ripristino i dati serie
    for (const k of Object.keys(cached.serieData))
      this.ctx.stagioneCachata.add(k); // ricostruisco la cache delle stagioni caricate
    this.correlateHelper.righeCorrelate = cached.righeCorrelate ?? []; // ripristino le righe correlate
    this.correlateHelper.righeCorrelateInCaricamento = false; // segno finite le correlate

    requestAnimationFrame(() => {
      this._sfondoPronto =
        this._titoloPronto =
        this._descPronta =
        this._tabellaPronta =
          true; // segno pronti tutti i blocchi principali
      this.labelsHelper.aggiornaAltSfondo(); // aggiorno alt e title della scheda
      if (this.ctx.tipoContenuto === 'serie' && this.ctx.stagioneSelezionata)
        this.stagioniHelper.aggiornaUrlStagione(this.ctx.stagioneSelezionata); // riallineo l'URL stagione se sono su una serie
      this.verificaEAvviaAnimazioni(); // provo ad avviare le animazioni
      if (this.ctx.slugCorrente && !this._paramRiproduzioneInAttesa)
        this.trailerHelper.programmaInserimento(); // se posso programmo il trailer della scheda
      this.emettiInfoMedia();
    });
  }

  /**
   * Applica i dati tabellari ricevuti nello state di navigazione.
   *
   * @param t Oggetto tabellare ricevuto via state.
   * @returns void
   */
  private applicaTabellaDaState(t: any): void {
    this.anno = t.anno ?? null; // applico l'anno ricevuto
    this.durata = t.durata ?? null; // applico la durata ricevuta
    this.episodiTotali = t.numero_episodi ?? null; // applico il numero episodi ricevuto
    this.regista = String(t.regista || ''); // applico il regista ricevuto
    this._tabellaPronta = true; // segno pronta la tabella
  }

  /**
   * Reimposta lo stato interno della scheda prima di caricare un nuovo contenuto.
   *
   * @returns void
   */
private resetStatoScheda(): void {
    this.schedaPronta.pulisciInfoMedia();
    this.startAnim = this.startAnimTitolo = this.startAnimDescrizione = false; // spengo tutte le animazioni iniziali
    this.ctx.avvioTrailerSchedaRichiesto = false; // annullo eventuali richieste di avvio trailer
    this.ctx.trailerInRiproduzione = true; // riporto il trailer allo stato iniziale
    this._sfondoPronto =
      this._titoloPronto =
      this._descPronta =
      this._tabellaPronto =
      this._labelPronte =
        false; // resetto tutti i flag di prontezza
    this.urlSfondoScheda = ''; // forzo la distruzione dell'img sfondo nel DOM al prossimo detectChanges
    this.imgTitoloScheda = ''; // forzo la distruzione del titolo grafico nel DOM al prossimo detectChanges
    this.descrizioneTestuale = ''; // pulisco la descrizione testuale
    this.titoloScheda = this.descrizione = this.ctx.slugCorrente = ''; // pulisco titolo, descrizione semantica e slug
    this.labelsHelper.altSfondoScheda = this.labelsHelper.altTitoloScheda = ''; // pulisco gli alt della scheda
    this.labelsHelper.labelRiprendiTitle =
      this.labelsHelper.labelRiproduciTitle =
      this.labelsHelper.labelTrailerTitle =
        ''; // pulisco i title dei controlli
    this.anno = this.durata = this.episodiTotali = null;
    this.regista = ''; // pulisco i dati tabellari
    this.ctx.stagioni = [];
    this.ctx.serieData = {};
    this.ctx.stagioneSelezionata = null;
    this.ctx.stagioneCachata.clear(); // pulisco i dati stagione
    this.correlateHelper.reset(); // resetto le correlate
    window.scrollTo(0, 0); // riporto la finestra in cima
  }

  /**
   * Verifica se tutti i blocchi necessari sono pronti e, quando lo sono, avvia le animazioni finali.
   *
   * @returns void
   */
  private verificaEAvviaAnimazioni(): void {
    const tuttoPronto =
      this._loaderNascosto &&
      this._sfondoPronto &&
      this._titoloPronto &&
      this._descPronta &&
      this._tabellaPronta; // verifico se tutti i prerequisiti visivi sono pronti
    if (!tuttoPronto) return; // esco se manca ancora qualcosa

    this.emettiInfoMedia();

    const _param = this._paramRiproduzioneInAttesa; // mi salvo l'eventuale parametro play in attesa
    this._paramRiproduzioneInAttesa = null; // consumo il parametro di riproduzione pendente
    if (_param && !this.mostraPlayerVideo) {
      const ep = _param.startsWith('ep')
        ? Number(_param.replace('ep', ''))
        : undefined; // ricavo l'eventuale episodio da riprodurre
      if (this._stagioneRiproduzioneInAttesa) {
        this.ctx.stagioneSelezionata = this._stagioneRiproduzioneInAttesa; // applico la stagione letta dall'URL prima di aprire il player
        this._stagioneRiproduzioneInAttesa = null; // consumo la stagione di riproduzione pendente
      }
      this.avviaTransizionePlayer(ep); // apro direttamente il player principale
      this.schedaPronta.segnaPronte(); // segno pronta la scheda
      if (!this._labelPronte) {
        this._labelPronte = true; // segno che le label sono gia' state sincronizzate
        this.labelsHelper.commitLabelUISincronizzate(); // avvio la sincronizzazione delle label
      }
      return;
    }

    if (!this._labelPronte) {
      this._labelPronte = true; // segno che sto sincronizzando le label
      this.labelsHelper.commitLabelUISincronizzate().then(() => {
        if (this.ctx.distrutto) return; // esco se nel frattempo la scheda e' stata distrutta
        this.schedaPronta.segnaPronte(); // segno pronta la scheda dopo la sincronizzazione label
        requestAnimationFrame(() => {
          this.startAnim =
            this.startAnimTitolo =
            this.startAnimDescrizione =
              true; // avvio tutte le animazioni della scheda
        });
      });
      return;
    }

    this.schedaPronta.segnaPronte(); // segno pronta la scheda se le label erano gia' allineate
    requestAnimationFrame(() => {
      this.startAnim = this.startAnimTitolo = this.startAnimDescrizione = true; // avvio tutte le animazioni della scheda
    });
  }

  /**
   * Legge il tipo contenuto corrente a partire dall'URL attivo.
   *
   * @returns 'film' | 'serie' | null Tipo contenuto rilevato oppure null.
   */
  leggiTipoDaUrl(): 'film' | 'serie' | null {
    const segs = this.route.snapshot.url.map((s) => s.path); // leggo i segmenti URL della route corrente
    const parent = this.route.parent?.snapshot.url.map((s) => s.path) || []; // leggo gli eventuali segmenti parent
    const all = [...parent, ...segs].join('/'); // compongo l'URL logico completo
    if (/(^|\/)(film|movies)(\/|$)/.test(all)) return 'film'; // riconosco le route film
    if (/(^|\/)(serie|series)(\/|$)/.test(all)) return 'serie'; // riconosco le route serie
    return null; // se non riconosco nulla restituisco null
  }

  private onLoaderHidden = () => {
    this._loaderNascosto = true; // segno il loader globale come nascosto
    this.verificaEAvviaAnimazioni(); // provo ad avviare le animazioni dopo il loader
  };

  private emettiInfoMedia(): void {
    if (this.ctx.idContenuto && this.ctx.tipoContenuto && this.ctx.slugCorrente && this.titoloScheda) {
      this.schedaPronta.impostaInfoMedia({
        id: this.ctx.idContenuto,
        tipo: this.ctx.tipoContenuto,
        slug: this.ctx.slugCorrente,
        titolo: this.titoloScheda,
      });
    }
  }

  // Getter che mi restituisce questo valore in modo comodo nel template.
  private get _tabellaPronto(): boolean {
    return this._tabellaPronta;
  } // espongo il flag tabella pronta tramite getter interno
  // Getter che mi restituisce questo valore in modo comodo nel template.
  private set _tabellaPronto(v: boolean) {
    this._tabellaPronta = v;
  } // aggiorno il flag tabella pronta tramite setter interno

  onEliminaEpisodio(numeroEpisodio: number, chiaveArchivio: string): void {
    if (!this.puoRiordinareEpisodi) return;
    if (!this.utentePuoEliminareMedia()) {
      this.toastService.errore("ERRORE: non hai l'abilità per eliminare media.");
      return;
    }
    if (this.ctx.tipoContenuto !== 'serie' || !this.ctx.idContenuto) return;
    if (!chiaveArchivio) return;

    this.categorieFileEliminazioneEpisodio = {
      anteprime_episodi: true,
      cartella_hls: true,
    };

    this.episodioDaEliminare = {
      idSerie: this.ctx.idContenuto,
      chiaveArchivio,
      numeroEpisodio,
    };

    this.mostraModaleEliminaEpisodio = true;
  }

  chiudiModaleEliminaEpisodio(): void {
    if (this.eliminazioneEpisodioInCorso) return;
    this.mostraModaleEliminaEpisodio = false;
  }

  confermaEliminaEpisodio(): void {
    if (this.eliminazioneEpisodioInCorso || !this.episodioDaEliminare) return;
    if (!this.utentePuoEliminareMedia()) {
      this.toastService.errore("ERRORE: non hai l'abilità per eliminare media.");
      return;
    }

    this.eliminazioneEpisodioInCorso = true;

    this.api.eliminaEpisodioSerie(
      this.episodioDaEliminare.idSerie,
      this.episodioDaEliminare.chiaveArchivio,
      this.categorieFileEliminazioneEpisodio,
    ).pipe(take(1)).subscribe({
      next: () => {
        this.mostraModaleEliminaEpisodio = false;
        this.eliminazioneEpisodioInCorso = false;
        this.schedaCache.svuota();
        this.toastService.successo('Episodio eliminato con SUCCESSO.');
        setTimeout(() => {
          window.location.href = window.location.href;
        }, 500);
      },
      error: () => {
        this.mostraModaleEliminaEpisodio = false;
        this.eliminazioneEpisodioInCorso = false;
        this.toastService.errore("Errore durante l'eliminazione dell'episodio.");
      },
    });
  }

  onModificaEpisodio(numeroEpisodio: number, chiaveArchivio: string): void {
    if (!this.puoRiordinareEpisodi) return;
    if (!this.utentePuoModificareMedia()) {
      this.toastService.errore("ERRORE: non hai l'abilità per modificare media.");
      return;
    }
    if (this.ctx.tipoContenuto !== 'serie' || !this.ctx.idContenuto) return;
    if (!chiaveArchivio || !this.ctx.stagioneSelezionata) return;

    const stagioneCorrente = this.ctx.stagioni.find(
      (s) => String(s.numero_stagione) === String(this.ctx.stagioneSelezionata),
    );

    if (!stagioneCorrente) return;

    window.dispatchEvent(
      new CustomEvent('apri-form-modifica-episodio', {
        detail: {
          idSerie: this.ctx.idContenuto,
          idStagione: stagioneCorrente.id_stagione,
          numeroStagione: Number(stagioneCorrente.numero_stagione),
          numeroEpisodio,
          chiaveArchivio,
        },
      }),
    );
  }
}
