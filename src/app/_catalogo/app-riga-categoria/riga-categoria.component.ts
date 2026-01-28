import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { HoverLocandinaService } from './categoria_services/hover-locandina.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { Subscription } from 'rxjs';
import { TipoContenutoService } from './categoria_services/tipo-contenuto.service';
@Component({
  selector: 'app-riga-categoria',
  templateUrl: './riga-categoria.component.html',
  styleUrls: ['./riga-categoria.component.scss'],
})
export class RigaCategoriaComponent implements OnChanges, OnInit, OnDestroy {
  @Input() locandine: string[] = [];
  @Input() categoria = '';
  @Input() tickResetPagine = 0;

   @ViewChildren('elementoLocandina', { read: ElementRef })
 elementiLocandina!: QueryList<ElementRef>;
  locandineVisibili = 5;
  indicePagina = 0;
  numeroMassimoPagine = 0;
  trasformazioneWrapper = '';
  mostraSpinner = false;

  sottoscrizioni = new Subscription();
  idCiclo = 0;
  cicloTrackBy = 0;
  motivoCopertura = '';
  attendoAggiornamentoLocandine = false;
  inAttesaImmagini = false;
  totaleAtteso = 0;
  conteggioCaricate = 0;
  avvioSpinnerAt = 0;
  permanenzaMinimaMs = 350;
  fallbackMaxMs = 2000;
  timerFallback: any = 0;
  timerNascondi: any = 0;

  ritardoHoverMs = 380;
  ritardoUscitaHoverMs = 320;
  timerEntrata: any = null;
  timerUscita: any = null;

  constructor(
    public servizioHoverLocandina: HoverLocandinaService,
    public cambioLingua: CambioLinguaService,
     public tipoContenuto: TipoContenutoService,
 public riferitore: ChangeDetectorRef,
  ) {}

  ngOnChanges(_changes: SimpleChanges): void {
     if (_changes['tickResetPagine']) {
 this.indicePagina = 0;
 }
    this.calcolaNumeroMassimoPagine();
    if (this.indicePagina > this.numeroMassimoPagine) this.indicePagina = 0;
    this.aggiornaTrasformazioneWrapper();

    if (
      _changes['locandine'] &&
      this.mostraSpinner &&
      this.motivoCopertura === 'lingua'
    ) {
      if (this.attendoAggiornamentoLocandine) {
        this.attendoAggiornamentoLocandine = false;
        this.avviaAttesaImmaginiLingua(this.idCiclo);
      }
    }
     if (this.mostraSpinner && this.motivoCopertura === 'tipo') {
 this.assicuraCoperturaCompleta(this.idCiclo, 0);
 }
  }

  ngOnInit(): void {
    try {
      this.sottoscrizioni.unsubscribe();
    } catch {}
    this.sottoscrizioni = new Subscription();

    this.sottoscrizioni.add(
      this.cambioLingua.cambioLinguaAvviato$.subscribe(() => {
        this.avviaCopertura('lingua');
        this.attendoAggiornamentoLocandine = true;
      }),
    );

    // quando la lingua e' stata applicata, mi preparo ad aspettare le nuove <img>
    // (ma l'Input locandine potrebbe arrivare un attimo dopo -> gestito da attendoAggiornamentoLocandine)
    this.sottoscrizioni.add(
      this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
        if (!this.mostraSpinner) this.avviaCopertura('lingua');
         this.attendoAggiornamentoLocandine = false;
 this.avviaAttesaImmaginiLingua(this.idCiclo);
      }),
    );


 this.sottoscrizioni.add(
 this.tipoContenuto.cambioTipoAvviato$.subscribe(({ id }) => {
 this.avviaCopertura('tipo', id);
 }),
 );

 this.sottoscrizioni.add(
 this.tipoContenuto.cambioTipoApplicato$.subscribe(({ id }) => {
 this.fineCoperturaDopoMinimo(id);
 }),
 );
  }

  ngOnDestroy(): void {
    this.sottoscrizioni.unsubscribe();
    this.azzeraTimer();
  }

  calcolaNumeroMassimoPagine(): void {
    const totale = this.locandine.length;
    this.numeroMassimoPagine = Math.max(
      Math.ceil(totale / this.locandineVisibili) - 1,
      0,
    );
  }

  aggiornaTrasformazioneWrapper(): void {
    this.trasformazioneWrapper = `translateX(${-this.indicePagina * 100}%)`;
  }

  paginaSuccessiva(): void {
    if (this.indicePagina < this.numeroMassimoPagine) {
      this.indicePagina++;
      this.aggiornaTrasformazioneWrapper();
    }
  }

  paginaPrecedente(): void {
    if (this.indicePagina > 0) {
      this.indicePagina--;
      this.aggiornaTrasformazioneWrapper();
    }
  }

  onMouseEnterLocandina(src: string): void {
    if (this.timerUscita) clearTimeout(this.timerUscita);
    if (this.timerEntrata) clearTimeout(this.timerEntrata);

    this.timerEntrata = setTimeout(() => {
  const slug = this.slugDaLocandina(src);
  const urlSfondo = `assets/carosello_locandine/carosello_${slug}.webp`;

  const lang = this.cambioLingua.leggiCodiceLingua(); // 'it' | 'en'
  const urlTrailer = this.urlTrailerHover(lang, slug);

  this.servizioHoverLocandina.emettiEntrata(urlSfondo, urlTrailer);
}, this.ritardoHoverMs);
  }

  onMouseLeaveLocandina(): void {
    if (this.timerEntrata) clearTimeout(this.timerEntrata);
    if (this.timerUscita) clearTimeout(this.timerUscita);

    this.timerUscita = setTimeout(() => {

 const ancoraSuLocandina = !!document.querySelector('.locandina:hover');
 if (ancoraSuLocandina) return;
 this.servizioHoverLocandina.emettiUscita();
    }, this.ritardoUscitaHoverMs);
  }

  tracciaLocandina(indice: number, src: string): string {
 const base = String(src || '');
 if (this.mostraSpinner && this.motivoCopertura === 'tipo') {
 return this.cicloTrackBy + '|' + indice + '|' + base;
 }
 return base;
}

  avviaCopertura(motivo: string, idForzato: number = 0): void {
 this.idCiclo = idForzato ? idForzato : (this.idCiclo + 1);
    this.motivoCopertura = motivo;
    if (motivo === 'tipo') this.cicloTrackBy += 1;
    this.azzeraTimer();

    this.inAttesaImmagini = false;
    this.totaleAtteso = 0;
    this.conteggioCaricate = 0;

    this.mostraSpinner = true;
    this.avvioSpinnerAt = Date.now();

    try {
      this.riferitore.detectChanges();
    } catch {}


 requestAnimationFrame(() => {
 try { this.riferitore.detectChanges(); } catch {}
 if (motivo === 'tipo') this.assicuraCoperturaCompleta(this.idCiclo, 0);
 });
  }

  avviaAttesaImmaginiLingua(id: number): void {
    if (id !== this.idCiclo) return;
    if (!this.mostraSpinner) return;

    // se le locandine non sono ancora arrivate, esco: mi ri-attiva ngOnChanges
    if (this.attendoAggiornamentoLocandine) return;

    this.inAttesaImmagini = true;
    this.totaleAtteso = (this.locandine || []).length;
    this.conteggioCaricate = 0;

 if (this.totaleAtteso === 0) {
 this.fineSePronto(true, id);
 return;
 }
    if (this.timerFallback) clearTimeout(this.timerFallback);
    this.timerFallback = setTimeout(
      () => this.fineSePronto(true, id),
      this.fallbackMaxMs,
    );
  }

  immagineStabilizzata(): void {
    if (!this.inAttesaImmagini) return;
    this.conteggioCaricate += 1;
    this.fineSePronto(false, this.idCiclo);
  }

  fineSePronto(forzatura: boolean, id: number): void {
    if (id !== this.idCiclo) return;
    const pronto = forzatura || this.conteggioCaricate >= this.totaleAtteso;
    if (!pronto) return;

    this.inAttesaImmagini = false;
    if (this.timerNascondi) clearTimeout(this.timerNascondi);

    const elapsed = Date.now() - (this.avvioSpinnerAt || 0);
    const manca = Math.max(0, this.permanenzaMinimaMs - elapsed);

    this.timerNascondi = setTimeout(() => {
      if (id !== this.idCiclo) return;
      this.mostraSpinner = false;
      this.motivoCopertura = '';
      try {
        this.riferitore.detectChanges();
      } catch {}
    }, manca);
  }

  azzeraTimer(): void {
    if (this.timerFallback) {
      clearTimeout(this.timerFallback);
      this.timerFallback = 0;
    }
    if (this.timerNascondi) {
      clearTimeout(this.timerNascondi);
      this.timerNascondi = 0;
    }
  }


  assicuraCoperturaCompleta(id: number, tentativi: number): void {
  if (id !== this.idCiclo) return;
  if (!this.mostraSpinner) return;

  const lista = this.elementiLocandina ? this.elementiLocandina.toArray() : [];
  if (!lista.length) {
    if (tentativi >= 10) return;
   requestAnimationFrame(() => this.assicuraCoperturaCompleta(id, tentativi + 1));
    return;
  }

  let ok = true;
  for (const ref of lista) {
    const host = ref?.nativeElement;
    const cover = host ? host.querySelector('.carica_img') : null;
    if (!cover || !cover.classList || !cover.classList.contains('visibile')) {
      ok = false;
      break;
    }
  }

  if (ok) return;
  if (tentativi >= 10) return;

  try { this.riferitore.detectChanges(); } catch {}
  requestAnimationFrame(() => this.assicuraCoperturaCompleta(id, tentativi + 1));
}

fineCoperturaDopoMinimo(id: number): void {
  if (id !== this.idCiclo) return;
  if (this.timerNascondi) clearTimeout(this.timerNascondi);

  // stesso feeling del vecchio: tipo piu' "snappy"
  const manca = 100;

  this.timerNascondi = setTimeout(() => {
    if (id !== this.idCiclo) return;
    this.mostraSpinner = false;
    this.motivoCopertura = '';
    try { this.riferitore.detectChanges(); } catch {}
  }, manca);
}

 slugDaLocandina(url: string): string {
 const u = String(url || '');
 const file = (u.split('/').pop() || '').trim(); // locandina_it_slug.webp
 const m = file.match(/^locandina_(it|en)_(.+)\.webp$/i);
 if (m && m[2]) return m[2];
 return file.replace(/\.webp$/i, '');
 }

 urlTrailerHover(lang: string, slug: string): string {
  const l = String(lang || '').toLowerCase() === 'en' ? 'en' : 'it';
  const folder = l === 'it' ? 'mp4-trailer-it' : 'mp4-trailer-en';
  const prefix = l === 'it' ? 'trailer_ita_' : 'trailer_en_';
  return `https://d2kd3i5q9rl184.cloudfront.net/${folder}/${prefix}${slug}.mp4`;
}
}
