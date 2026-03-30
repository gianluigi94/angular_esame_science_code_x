// Componente orchestratore della riga categoria che inizializza gli helper, collega gli eventi e delega la logica operativa.

import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, QueryList, ViewChildren} from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { HoverLocandinaService } from './categoria_services/hover-locandina.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { TipoContenutoService } from './categoria_services/tipo-contenuto.service';
import { AudioGlobaleService } from 'src/app/_servizi_globali/audio-globale.service';
import { StopVideoGlobaleService } from './categoria_services/stop-video-globale.service';
import { ApiService } from 'src/app/_servizi_globali/api.service';

import { titoloPulitoPerTooltip } from './categoria_utility/categoria-url.utils';
import { CategoriaPaginazioneHelper } from './categoria_helpers/categoria-paginazione.helper';
import { CategoriaSpinnerHelper } from './categoria_helpers/categoria-spinner.helper';
import { CategoriaHoverHelper } from './categoria_helpers/categoria-hover.helper';
import { CategoriaClickHelper } from './categoria_helpers/categoria-click.helper';

@Component({
  selector: 'app-riga-categoria',
  templateUrl: './riga-categoria.component.html',
  styleUrls: ['./riga-categoria.component.scss'],
})
export class RigaCategoriaComponent implements OnChanges, OnInit, OnDestroy {
  @Input() locandine: {
    src: string;
    titolo: string;
    sottotitolo: string;
    tipo: string;
    id_media: string;
  }[] = []; // le locandine della riga
  @Input() categoria = ''; // il nome categoria
  @Input() idCategoria = ''; // l'id della categoria
  @Input() tickResetPagine = 0; // il tick che forza il reset pagine
  @Input() ritardoNavigazioneStessaTipologiaMs = 0; // il ritardo prima della navigazione stessa tipologia
  @Input() ritardoClickLocandinaMs = 0; // il ritardo iniziale del click locandina
  @Input() attendiChiusuraPlayerSchedaPrimaDiNavigare = false; // se devo aspettare la chiusura completa del player
  @Input() abilitaSalvataggiSessionStorage = true; // se posso salvare dati temporanei in sessionStorage
  @Input() titolo = ''; // il titolo della riga
  @Input() locandineVisibili = 5; // quante locandine sono visibili per pagina

  @ViewChildren('elementoLocandina', { read: ElementRef })
  elementiLocandina!: QueryList<ElementRef>; // collego gli elementi locandina reali del template

  // lista getter: // espongo al template valori calcolati o delegati come proprieta' leggibile, senza chiamarli come fossero funzioni.
  get indicePagina(): number {
    return this.paginazione.indicePagina;
  } // espongo l'indice pagina dal relativo helper
  get numeroMassimoPagine(): number {
    return this.paginazione.numeroMassimoPagine;
  } // espongo il numero massimo pagine dall'helper
  get trasformazioneWrapper(): string {
    return this.paginazione.trasformazioneWrapper;
  } // espongo la trasformazione CSS del wrapper
  get cicloTrackBy(): number {
    return this.paginazione.cicloTrackBy;
  } // espongo il ciclo trackBy dell'helper paginazione
  get mostraSpinner(): boolean {
    return this.spinner.mostraSpinner;
  } // espongo lo stato visibile dello spinner
  get motivoCopertura(): string {
    return this.spinner.motivoCopertura;
  } // espongo il motivo corrente della copertura

  solo_brawser_blocca = false; // tengo lo stato che indica il solo blocco browser audio

  private readonly paginazione: CategoriaPaginazioneHelper; // tengo l'helper della paginazione
  private readonly spinner: CategoriaSpinnerHelper; // tengo l'helper della copertura spinner
  private readonly hover: CategoriaHoverHelper; // tengo l'helper dell'hover locandina
  private readonly click: CategoriaClickHelper; // tengo l'helper del click locandina
  private sottoscrizioni = new Subscription(); // raccolgo le subscription da chiudere in destroy

  constructor(
    public servizioHoverLocandina: HoverLocandinaService,
    public cambioLingua: CambioLinguaService,
    private audioGlobaleService: AudioGlobaleService,
    public tipoContenuto: TipoContenutoService,
    public router: Router,
    private api: ApiService,
    private stopVideoGlobale: StopVideoGlobaleService,
    public riferitore: ChangeDetectorRef,
  ) {
    this.paginazione = new CategoriaPaginazioneHelper(); // inizializzo l'helper della paginazione
    this.spinner = new CategoriaSpinnerHelper(
      riferitore,
      () => this.elementiLocandina,
      () => this.locandine,
    ); // inizializzo l'helper spinner collegandolo a view e locandine correnti
    this.hover = new CategoriaHoverHelper(servizioHoverLocandina, cambioLingua); // inizializzo l'helper hover
    this.click = new CategoriaClickHelper(
      router,
      api,
      cambioLingua,
      tipoContenuto,
      stopVideoGlobale,
    ); // inizializzo l'helper click
  }

  /**
   * Reagisce ai cambi degli input del componente.
   * - Resetta la paginazione quando richiesto
   * - Ricalcola limiti e trasformazione del wrapper
   * - Coordina la fase di attesa immagini durante il cambio lingua
   * - Verifica la copertura completa durante il cambio tipo
   *
   * @param changes Collezione dei cambi input ricevuti da Angular.
   * @returns void
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tickResetPagine']) this.paginazione.resetPagina(); // resetto la pagina quando arriva un tick dedicato

    this.paginazione.calcolaNumeroMassimoPagine(
      this.locandine.length,
      this.locandineVisibili,
    ); // ricalcolo il numero massimo di pagine
    if (this.paginazione.indicePagina > this.paginazione.numeroMassimoPagine)
      this.paginazione.resetPagina(); // se la pagina attuale e' fuori range la riporto all'inizio
    this.paginazione.aggiornaTrasformazioneWrapper(); // aggiorno sempre la trasformazione del wrapper

    if (
      changes['locandine'] &&
      this.spinner.mostraSpinner &&
      this.spinner.motivoCopertura === 'lingua'
    ) {
      if (this.spinner.attendoAggiornamentoLocandine) {
        this.spinner.attendoAggiornamentoLocandine = false; // segno che le locandine sono state aggiornate
        this.spinner.avviaAttesaImmaginiLingua(this.spinner.leggiIdCiclo()); // faccio partire l'attesa delle immagini per il ciclo corrente
      }
    }
    if (this.spinner.mostraSpinner && this.spinner.motivoCopertura === 'tipo')
      this.spinner.assicuraCoperturaCompleta(this.spinner.leggiIdCiclo(), 0); // ricontrollo la copertura completa durante il cambio tipo
  }

  /**
   * Inizializza le sottoscrizioni e collega gli eventi dei servizi esterni.
   * - Pulisce eventuali subscription precedenti
   * - Reagisce ai cambi lingua
   * - Reagisce ai cambi tipo contenuto
   * - Reagisce allo stato audio globale
   *
   * @returns void
   */
  ngOnInit(): void {
    try {
      this.sottoscrizioni.unsubscribe();
    } catch {} // provo a chiudere eventuali vecchie subscription
    this.sottoscrizioni = new Subscription(); // ricreo il contenitore delle nuove subscription

    this.sottoscrizioni.add(
      this.cambioLingua.cambioLinguaAvviato$.subscribe(() => {
        this.spinner.avviaCopertura('lingua'); // avvio subito la copertura per il cambio lingua
        this.spinner.attendoAggiornamentoLocandine = true; // segno che sto aspettando l'aggiornamento delle locandine
      }),
    );

    this.sottoscrizioni.add(
      this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
        if (!this.spinner.mostraSpinner) this.spinner.avviaCopertura('lingua'); // se serve riapro la copertura lingua
        if (this.spinner.attendoAggiornamentoLocandine) return; // aspetto ancora il cambio locandine se non e' terminato
        this.spinner.avviaAttesaImmaginiLingua(this.spinner.leggiIdCiclo()); // avvio l'attesa delle immagini del ciclo corrente
      }),
    );

    this.sottoscrizioni.add(
      this.tipoContenuto.cambioTipoAvviato$.subscribe(({ id }) => {
        this.paginazione.incrementaCicloTrackBy(); // incremento il ciclo trackBy per forzare il refresh
        this.spinner.avviaCopertura('tipo', id); // avvio la copertura per il cambio tipo con id condiviso
      }),
    );

    this.sottoscrizioni.add(
      this.tipoContenuto.cambioTipoApplicato$.subscribe(({ id }) =>
        this.spinner.fineCoperturaDopoMinimo(id),
      ), // chiudo la copertura dopo il minimo quando il cambio tipo e' applicato
    );

    this.sottoscrizioni.add(
      this.audioGlobaleService.soloBlocca$.subscribe((v) => {
        this.solo_brawser_blocca = !!v; // allineo il flag locale allo stato ricevuto
        try {
          this.riferitore.detectChanges();
        } catch {} // provo ad aggiornare subito la view
      }),
    );
  }

  /**
   * Ripulisce le sottoscrizioni e distrugge gli helper che mantengono stato interno.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    this.sottoscrizioni.unsubscribe(); // chiudo tutte le subscription attive
    this.spinner.destroy(); // distruggo l'helper spinner
    this.hover.destroy(); // distruggo l'helper hover
  }

  /**
   * Porta la riga alla pagina successiva e registra lo scroll categoria.
   *
   * @returns void
   */
  paginaSuccessiva(): void {
    this.paginazione.paginaSuccessiva(() =>
      this.paginazione.registraClickScrollCategoria(
        this.idCategoria,
        this.abilitaSalvataggiSessionStorage,
      ),
    ); // delego il passaggio pagina e registro la posizione corrente
  }

  /**
   * Porta la riga alla pagina precedente e registra lo scroll categoria.
   *
   * @returns void
   */
  paginaPrecedente(): void {
    this.paginazione.paginaPrecedente(() =>
      this.paginazione.registraClickScrollCategoria(
        this.idCategoria,
        this.abilitaSalvataggiSessionStorage,
      ),
    ); // delego il ritorno pagina e registro la posizione corrente
  }

  /**
   * Imposta la pagina iniziale da mostrare nella riga.
   *
   * @param pagina Indice pagina richiesto.
   * @returns void
   */
  impostaPaginaIniziale(pagina: number): void {
    this.paginazione.impostaPaginaIniziale(pagina); // delego all'helper il clamp e l'impostazione della pagina
  }

  /**
   * Restituisce la chiave trackBy della locandina corrente.
   *
   * @param indice Indice della locandina nel ciclo template.
   * @param loc Locandina corrente.
   * @returns string Chiave trackBy da usare nel template.
   */
  tracciaLocandina = (indice: number, loc: { src: string }): string => {
    return this.paginazione.tracciaLocandina(
      indice,
      loc,
      this.spinner.mostraSpinner,
      this.spinner.motivoCopertura,
    ); // delego all'helper la costruzione della chiave trackBy
  };

  /**
   * Notifica che una locandina si e' stabilizzata lato immagine.
   *
   * @returns void
   */
  immagineStabilizzata = (): void => {
    this.spinner.immagineStabilizzata(); // inoltro allo spinner la notifica di immagine stabilizzata
  };

  /**
   * Gestisce l'entrata hover su una locandina.
   *
   * @param loc Locandina entrata in hover.
   * @returns void
   */
  onMouseEnterLocandina(loc: {
    src: string;
    titolo: string;
    sottotitolo: string;
  }): void {
    this.hover.onMouseEnterLocandina(loc); // delego all'helper la logica di entrata hover
  }

  /**
   * Gestisce l'uscita hover dalla locandina.
   *
   * @returns void
   */
  onMouseLeaveLocandina(): void {
    this.hover.onMouseLeaveLocandina(); // delego all'helper la logica di uscita hover
  }

  /**
   * Gestisce il click sulla locandina e avvia il flusso di navigazione.
   *
   * @param loc Locandina cliccata con tipo, id media e sorgente immagine.
   * @returns Promise<void> Promise risolta al termine del flusso di click.
   */
  async onClickLocandina(loc: {
    tipo: string;
    id_media: string;
    src: string;
  }): Promise<void> {
    await this.click.onClickLocandina(
      loc,
      {
        ritardoClickLocandinaMs: this.ritardoClickLocandinaMs,
        ritardoNavigazioneStessaTipologiaMs:
          this.ritardoNavigazioneStessaTipologiaMs,
        attendiChiusuraPlayerSchedaPrimaDiNavigare:
          this.attendiChiusuraPlayerSchedaPrimaDiNavigare,
        abilitaSalvataggiSessionStorage: this.abilitaSalvataggiSessionStorage,
        idCategoria: this.idCategoria,
      },
      () => this.hover.clearTimers(),
    ); // delego all'helper il click completo passando config e pulizia timer hover
  }

  titoloPulitoPerTooltip = titoloPulitoPerTooltip; // espongo la utility pura direttamente al template
}
