import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';
import {
  vengoDaBenvenutoDaSessione,
  salvaPathNonTrovatoDopoCaricamento,
  leggiWelcomeTitoloStatoDaSessione,
} from 'src/app/_helpers_globali/helpers';
import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';

import { Router } from '@angular/router';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { Subscription } from 'rxjs';
import { NotFoundCloseService } from '../titles-main/not-found-close.service';
@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent implements AfterViewInit, OnInit, OnDestroy {
  private subClose404?: Subscription;


  public vengoDaBenvenuto: boolean = false;

  // ✅ controlla la classe .show della maschera
  public mostra404 = false;
  public animazione404InCorso = false;
  public navigazioneInCorso = false;
  public timerFallbackNavigazione: any = 0;
    constructor(
    private animateService: AnimateService,
    private notFoundClose: NotFoundCloseService,
    private router: Router,
    private cambioLinguaService: CambioLinguaService
  ) {}

  ngAfterViewInit(): void {
    // --- la tua logica attuale ---
    this.vengoDaBenvenuto = vengoDaBenvenutoDaSessione();

    const titoloStato = leggiWelcomeTitoloStatoDaSessione();
    const titoloEraCentrale = !titoloStato || titoloStato === 'CENTRO';

    const devoAnimareTitolo = this.vengoDaBenvenuto && titoloEraCentrale;

    requestAnimationFrame(() => {
      if (!devoAnimareTitolo) {
        this.animateService.setXNormale();
        this.animateService.setTitoloAltoGlobal();
      } else {
        this.animateService.setTitoloCentraleGlobal();
        this.animateService.setXGif();

        requestAnimationFrame(() => {
          this.animateService.setXNormale();
          this.animateService.animateTitoloVersoAltoGlobal(0.9, 0.05);
        });
      }

      requestAnimationFrame(() => {
        setTimeout(() => {
          salvaPathNonTrovatoDopoCaricamento(window.location.pathname);
        }, 0);
      });
    });

   setTimeout(() => { this.mostra404 = true; }, 600);
  }

    chiudi404(): void {
    if (this.animazione404InCorso) return;
    if (this.navigazioneInCorso) return;
    if (!this.mostra404) return; // e' gia' chiuso

    this.animazione404InCorso = true;
    this.mostra404 = false;

    // fallback: se transitionend non parte, navigo lo stesso
    if (this.timerFallbackNavigazione) {
      clearTimeout(this.timerFallbackNavigazione);
      this.timerFallbackNavigazione = 0;
    }
    this.timerFallbackNavigazione = setTimeout(() => {
      this.eseguiNavigazioneCatalogo();
    }, 420); // metti poco sopra la durata reale css (es. 380ms)
  }


  onMaskTransitionEnd(event: TransitionEvent): void {
       if (!this.animazione404InCorso) return;
    // niente filtri stretti su propertyName/target: spesso bloccano tutto
    this.eseguiNavigazioneCatalogo();
   }

  eseguiNavigazioneCatalogo(): void {
    if (this.navigazioneInCorso) return;

    this.navigazioneInCorso = true;
    this.animazione404InCorso = false;

    if (this.timerFallbackNavigazione) {
      clearTimeout(this.timerFallbackNavigazione);
      this.timerFallbackNavigazione = 0;
    }

    try {
      sessionStorage.setItem('transizione_404_catalogo', '1');
    } catch {}

    const lingua = this.cambioLinguaService.leggiCodiceLingua();
    const baseCatalogo =
      lingua === 'it'
        ? '/it/catalogo/film-serie'
        : '/en/catalog/movies-series';

        setTimeout(() => {
      this.router.navigateByUrl(baseCatalogo);
    }, 600);

  }


ngOnInit(): void {
  this.subClose404 = this.notFoundClose.close404$.subscribe(() => {
    this.chiudi404();
  });
}

ngOnDestroy(): void {
  this.subClose404?.unsubscribe();
}

}
