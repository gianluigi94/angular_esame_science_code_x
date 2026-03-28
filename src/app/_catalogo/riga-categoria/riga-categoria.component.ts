// ─── riga-categoria.component.ts ─────────────────────────────────────────────
// Orchestratore puro: inizializza gli helper, collega gli eventi, delega tutto.

import {
  Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy,
  ChangeDetectorRef, ElementRef, QueryList, ViewChildren,
} from '@angular/core';
import { Subscription }             from 'rxjs';
import { Router }                   from '@angular/router';
import { HoverLocandinaService }    from './categoria_services/hover-locandina.service';
import { CambioLinguaService }      from 'src/app/_servizi_globali/cambio-lingua.service';
import { TipoContenutoService }     from './categoria_services/tipo-contenuto.service';
import { AudioGlobaleService }      from 'src/app/_servizi_globali/audio-globale.service';
import { StopVideoGlobaleService }  from './categoria_services/stop-video-globale.service';
import { ApiService }               from 'src/app/_servizi_globali/api.service';

import { titoloPulitoPerTooltip }       from './categoria_utility/categoria-url.utils';
import { CategoriaPaginazioneHelper }   from './categoria_helpers/categoria-paginazione.helper';
import { CategoriaSpinnerHelper }       from './categoria_helpers/categoria-spinner.helper';
import { CategoriaHoverHelper }         from './categoria_helpers/categoria-hover.helper';
import { CategoriaClickHelper }         from './categoria_helpers/categoria-click.helper';

@Component({
  selector:    'app-riga-categoria',
  templateUrl: './riga-categoria.component.html',
  styleUrls:   ['./riga-categoria.component.scss'],
})
export class RigaCategoriaComponent implements OnChanges, OnInit, OnDestroy {

  // ── Input ─────────────────────────────────────────────────────────────────
  @Input() locandine: { src: string; titolo: string; sottotitolo: string; tipo: string; id_media: string }[] = [];
  @Input() categoria  = '';
  @Input() idCategoria = '';
  @Input() tickResetPagine = 0;
  @Input() ritardoNavigazioneStessaTipologiaMs  = 0;
  @Input() ritardoClickLocandinaMs              = 0;
  @Input() attendiChiusuraPlayerSchedaPrimaDiNavigare = false;
  @Input() abilitaSalvataggiSessionStorage      = true;
  @Input() titolo      = '';
  @Input() locandineVisibili = 5;

  @ViewChildren('elementoLocandina', { read: ElementRef })
  elementiLocandina!: QueryList<ElementRef>;

  // ── Binding per il template (delegati agli helper) ────────────────────────
  get indicePagina():          number  { return this.paginazione.indicePagina; }
  get numeroMassimoPagine():   number  { return this.paginazione.numeroMassimoPagine; }
  get trasformazioneWrapper(): string  { return this.paginazione.trasformazioneWrapper; }
  get cicloTrackBy():          number  { return this.paginazione.cicloTrackBy; }
  get mostraSpinner():         boolean { return this.spinner.mostraSpinner; }
  get motivoCopertura():       string  { return this.spinner.motivoCopertura; }

  solo_brawser_blocca = false;

  // ── Helper ────────────────────────────────────────────────────────────────
  private readonly paginazione: CategoriaPaginazioneHelper;
  private readonly spinner:     CategoriaSpinnerHelper;
  private readonly hover:       CategoriaHoverHelper;
  private readonly click:       CategoriaClickHelper;
  private sottoscrizioni = new Subscription();

  constructor(
    public  servizioHoverLocandina: HoverLocandinaService,
    public  cambioLingua:           CambioLinguaService,
    private audioGlobaleService:    AudioGlobaleService,
    public  tipoContenuto:          TipoContenutoService,
    public  router:                 Router,
    private api:                    ApiService,
    private stopVideoGlobale:       StopVideoGlobaleService,
    public  riferitore:             ChangeDetectorRef,
  ) {
    this.paginazione = new CategoriaPaginazioneHelper();
    this.spinner     = new CategoriaSpinnerHelper(
      riferitore,
      () => this.elementiLocandina,
      () => this.locandine,
    );
    this.hover  = new CategoriaHoverHelper(servizioHoverLocandina, cambioLingua);
    this.click  = new CategoriaClickHelper(router, api, cambioLingua, tipoContenuto, stopVideoGlobale);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tickResetPagine']) this.paginazione.resetPagina();

    this.paginazione.calcolaNumeroMassimoPagine(this.locandine.length, this.locandineVisibili);
    if (this.paginazione.indicePagina > this.paginazione.numeroMassimoPagine)
      this.paginazione.resetPagina();
    this.paginazione.aggiornaTrasformazioneWrapper();

    if (changes['locandine'] && this.spinner.mostraSpinner && this.spinner.motivoCopertura === 'lingua') {
      if (this.spinner.attendoAggiornamentoLocandine) {
        this.spinner.attendoAggiornamentoLocandine = false;
        this.spinner.avviaAttesaImmaginiLingua(this.spinner.leggiIdCiclo());
      }
    }
    if (this.spinner.mostraSpinner && this.spinner.motivoCopertura === 'tipo')
      this.spinner.assicuraCoperturaCompleta(this.spinner.leggiIdCiclo(), 0);
  }

  ngOnInit(): void {
    try { this.sottoscrizioni.unsubscribe(); } catch {}
    this.sottoscrizioni = new Subscription();

    this.sottoscrizioni.add(
      this.cambioLingua.cambioLinguaAvviato$.subscribe(() => {
        this.spinner.avviaCopertura('lingua');
        this.spinner.attendoAggiornamentoLocandine = true;
      }),
    );

    this.sottoscrizioni.add(
      this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
        if (!this.spinner.mostraSpinner) this.spinner.avviaCopertura('lingua');
        if (this.spinner.attendoAggiornamentoLocandine) return;
        this.spinner.avviaAttesaImmaginiLingua(this.spinner.leggiIdCiclo());
      }),
    );

    this.sottoscrizioni.add(
      this.tipoContenuto.cambioTipoAvviato$.subscribe(({ id }) => {
        this.paginazione.incrementaCicloTrackBy();
        this.spinner.avviaCopertura('tipo', id);
      }),
    );

    this.sottoscrizioni.add(
      this.tipoContenuto.cambioTipoApplicato$.subscribe(({ id }) =>
        this.spinner.fineCoperturaDopoMinimo(id)
      ),
    );

    this.sottoscrizioni.add(
      this.audioGlobaleService.soloBlocca$.subscribe((v) => {
        this.solo_brawser_blocca = !!v;
        try { this.riferitore.detectChanges(); } catch {}
      }),
    );
  }

  ngOnDestroy(): void {
    this.sottoscrizioni.unsubscribe();
    this.spinner.destroy();
    this.hover.destroy();
  }

  // ── Template API ──────────────────────────────────────────────────────────
  paginaSuccessiva(): void {
    this.paginazione.paginaSuccessiva(() =>
      this.paginazione.registraClickScrollCategoria(this.idCategoria, this.abilitaSalvataggiSessionStorage)
    );
  }

  paginaPrecedente(): void {
    this.paginazione.paginaPrecedente(() =>
      this.paginazione.registraClickScrollCategoria(this.idCategoria, this.abilitaSalvataggiSessionStorage)
    );
  }

  impostaPaginaIniziale(pagina: number): void {
    this.paginazione.impostaPaginaIniziale(pagina);
  }

  tracciaLocandina = (indice: number, loc: { src: string }): string => {
    return this.paginazione.tracciaLocandina(indice, loc, this.spinner.mostraSpinner, this.spinner.motivoCopertura);
};

  immagineStabilizzata = (): void => { this.spinner.immagineStabilizzata(); };

  onMouseEnterLocandina(loc: { src: string; titolo: string; sottotitolo: string }): void {
    this.hover.onMouseEnterLocandina(loc);
  }

  onMouseLeaveLocandina(): void  { this.hover.onMouseLeaveLocandina(); }

  async onClickLocandina(loc: { tipo: string; id_media: string; src: string }): Promise<void> {
    await this.click.onClickLocandina(loc, {
      ritardoClickLocandinaMs:                    this.ritardoClickLocandinaMs,
      ritardoNavigazioneStessaTipologiaMs:        this.ritardoNavigazioneStessaTipologiaMs,
      attendiChiusuraPlayerSchedaPrimaDiNavigare: this.attendiChiusuraPlayerSchedaPrimaDiNavigare,
      abilitaSalvataggiSessionStorage:            this.abilitaSalvataggiSessionStorage,
      idCategoria:                                this.idCategoria,
    }, () => this.hover.clearTimers());
  }

  // Usata nel template via pipe diretta
  titoloPulitoPerTooltip = titoloPulitoPerTooltip;
}
